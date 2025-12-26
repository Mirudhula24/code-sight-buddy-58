import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, repositoryUrl, conversationHistory = [] } = await req.json();

    console.log('Chat request received:', { question, repositoryUrl, historyLength: conversationHistory.length });

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: 'Repository URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract repo name from URL for context
    const repoMatch = repositoryUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    const repoName = repoMatch ? repoMatch[1] : repositoryUrl;

    // First, find the repository in our database
    const { data: repository, error: repoError } = await (supabase
      .from('repositories')
      .select('id, repo_name, ingestion_status, chunks_count')
      .eq('repo_url', repositoryUrl)
      .maybeSingle() as any);

    if (repoError) {
      console.error('Repository lookup error:', repoError);
    }

    // Check if repository has been ingested
    if (!repository) {
      return new Response(
        JSON.stringify({ 
          error: 'Repository has not been analyzed yet. Please run an analysis first.',
          code: 'NOT_INGESTED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (repository.ingestion_status === 'processing') {
      return new Response(
        JSON.stringify({ 
          error: 'Repository is still being processed. Please wait for analysis to complete.',
          code: 'PROCESSING'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (repository.ingestion_status === 'failed' || repository.chunks_count === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No code chunks available for this repository. Please re-analyze the repository.',
          code: 'NO_CHUNKS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found repository ${repository.id} with ${repository.chunks_count} chunks`);

    // Generate embedding for the question
    console.log('Generating embedding for question...');
    
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: question,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding generation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process your question. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const questionEmbedding = embeddingData.data?.[0]?.embedding;

    if (!questionEmbedding) {
      console.error('No embedding returned');
      return new Response(
        JSON.stringify({ error: 'Failed to process your question. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Embedding generated, searching for relevant code chunks...');

    // Perform vector similarity search filtered by repo_id
    const { data: chunks, error: searchError } = await (supabase
      .rpc('match_code_chunks', {
        query_embedding: questionEmbedding,
        match_threshold: 0.3, // Lower threshold for better recall
        match_count: 8,
        p_repo_id: repository.id,
      }) as any);

    if (searchError) {
      console.error('Vector search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Failed to search code. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chunks || chunks.length === 0) {
      console.log('No relevant chunks found');
      return new Response(
        JSON.stringify({ 
          answer: "I don't have enough context from the codebase to answer this question. The repository has been analyzed, but no relevant code sections were found matching your query. Try asking about specific files, functions, or features mentioned in the codebase.",
          sourcesUsed: [],
          noContext: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${chunks.length} relevant code chunks`);

    // Build code context from retrieved chunks
    const codeContext = chunks
      .map((chunk: any, i: number) => 
        `### Chunk ${i + 1} (${chunk.file_path}) [Relevance: ${(chunk.similarity * 100).toFixed(1)}%]\n\`\`\`\n${chunk.content}\n\`\`\``
      )
      .join('\n\n');

    // Build the prompt with strict grounding instructions
    const systemPrompt = `You are an expert code assistant for the repository "${repoName}". 

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY answer based on the code chunks provided below. Do NOT make assumptions.
2. If the provided code does not contain enough information to answer the question, say "I don't have enough context from the code to answer this question" and explain what information is missing.
3. NEVER hallucinate or guess about code that isn't shown.
4. NEVER infer functionality from the repository name or make assumptions.
5. When referencing code, cite the specific file path.
6. If asked about something not in the provided context, clearly state that.

Retrieved Code Context:
${codeContext}

Remember: Base your response ONLY on the code shown above. If you can't answer from this context, say so honestly.`;

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: question },
    ];

    console.log('Calling Lovable AI for chat response...');

    // Call Lovable AI for chat completion
    const chatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: false,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('AI API error:', chatResponse.status, errorText);

      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('AI chat failed');
    }

    const chatData = await chatResponse.json();
    const answer = chatData.choices?.[0]?.message?.content || 'I was unable to generate a response.';

    console.log('Chat response generated successfully');

    return new Response(
      JSON.stringify({
        answer,
        sourcesUsed: chunks.map((chunk: any) => ({
          file: chunk.file_path,
          similarity: chunk.similarity,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-repo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chat failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
