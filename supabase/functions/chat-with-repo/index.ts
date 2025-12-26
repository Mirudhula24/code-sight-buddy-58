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

    console.log('Generating embedding for question...');

    // Generate embedding for the question using Lovable AI
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

    let relevantCode = '';
    let codeSnippets: Array<{ file_path: string; content: string; similarity: number }> = [];

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      const questionEmbedding = embeddingData.data?.[0]?.embedding;

      if (questionEmbedding) {
        console.log('Embedding generated, searching for relevant code snippets...');

        // Query code_snippets table using vector similarity search
        const { data: snippets, error: searchError } = await (supabase
          .rpc('match_code_snippets', {
            query_embedding: questionEmbedding,
            match_threshold: 0.5,
            match_count: 10,
            repo_url: repositoryUrl,
          }) as any);

        if (searchError) {
          console.error('Vector search error:', searchError);
          // Try fallback text search if vector search fails
          const { data: textSnippets, error: textSearchError } = await (supabase
            .from('code_snippets')
            .select('file_path, content')
            .ilike('repository_url', `%${repoName}%`)
            .limit(5) as any);

          if (!textSearchError && textSnippets) {
            codeSnippets = textSnippets.map((s: any) => ({
              file_path: s.file_path,
              content: s.content,
              similarity: 0.5,
            }));
          }
        } else if (snippets && snippets.length > 0) {
          console.log(`Found ${snippets.length} relevant code snippets`);
          codeSnippets = snippets;
        }
      }
    } else {
      console.log('Embedding generation failed, using text-based search fallback');
      // Fallback: Simple text-based search
      const { data: textSnippets, error: textSearchError } = await (supabase
        .from('code_snippets')
        .select('file_path, content')
        .or(`content.ilike.%${question.split(' ').slice(0, 3).join('%')}%,file_path.ilike.%${question.split(' ')[0]}%`)
        .eq('repository_url', repositoryUrl)
        .limit(5) as any);

      if (!textSearchError && textSnippets) {
        codeSnippets = textSnippets.map((s: any) => ({
          file_path: s.file_path,
          content: s.content,
          similarity: 0.5,
        }));
      }
    }

    // Build code context from snippets
    if (codeSnippets.length > 0) {
      relevantCode = codeSnippets
        .map((s) => `### File: ${s.file_path}\n\`\`\`\n${s.content?.substring(0, 2000) || ''}\n\`\`\``)
        .join('\n\n');
      console.log(`Built context from ${codeSnippets.length} code snippets`);
    } else {
      console.log('No code snippets found, proceeding with general knowledge');
      relevantCode = 'No specific code snippets were found for this query. I will answer based on general software development knowledge.';
    }

    // Build messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: `You are an expert code assistant helping developers understand the codebase of ${repoName}. 
You have access to code snippets from the repository and should answer questions based on them.

When answering:
1. Reference specific files and code when relevant
2. Explain code concepts clearly
3. Provide examples when helpful
4. If you don't have enough context, say so honestly
5. Format code snippets in markdown code blocks with proper language tags

Relevant code context:
${relevantCode}`,
      },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: question,
      },
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
        sourcesUsed: codeSnippets.map((s) => ({
          file: s.file_path,
          similarity: s.similarity,
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
