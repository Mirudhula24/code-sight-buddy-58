import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractKeywords(message: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
    'what', 'how', 'where', 'when', 'why', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'you',
    'your', 'he', 'she', 'it', 'they', 'them', 'his', 'her', 'its', 'their',
    'explain', 'tell', 'show', 'find', 'work', 'works', 'working', 'use', 'using'
  ]);
  
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Also look for common code patterns
  const codePatterns = message.match(/[A-Z][a-z]+[A-Z][a-zA-Z]*/g) || []; // CamelCase
  const snakeCase = message.match(/[a-z]+_[a-z_]+/g) || []; // snake_case
  
  return [...new Set([...words, ...codePatterns.map(p => p.toLowerCase()), ...snakeCase])];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, repositoryUrl, conversationHistory = [] } = await req.json();
    
    if (!message || !repositoryUrl) {
      return new Response(
        JSON.stringify({ error: 'Message and repository URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the repository
    const { data: repo, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('repo_url', repositoryUrl)
      .single();

    if (repoError || !repo) {
      return new Response(
        JSON.stringify({ 
          error: 'Repository not indexed yet. Please wait for indexing to complete.',
          code: 'NOT_INDEXED',
          needsIndexing: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (repo.ingestion_status === 'indexing') {
      return new Response(
        JSON.stringify({ 
          error: 'Repository is currently being indexed. Please wait.',
          code: 'INDEXING_IN_PROGRESS',
          progress: repo.metadata?.progress || 0
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (repo.ingestion_status === 'failed') {
      return new Response(
        JSON.stringify({ 
          error: 'Repository indexing failed. Please try re-indexing.',
          code: 'INDEXING_FAILED',
          needsIndexing: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if chunks exist
    const { count } = await supabase
      .from('code_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('repo_id', repo.id);

    if (!count || count === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No code chunks available. Please re-index the repository.',
          code: 'NO_CHUNKS',
          needsIndexing: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract keywords for search
    const keywords = extractKeywords(message);
    console.log('Searching with keywords:', keywords);

    // Search for relevant chunks using keyword matching
    let relevantChunks: any[] = [];
    
    if (keywords.length > 0) {
      // Build a search query for each keyword
      const searchConditions = keywords.map(keyword => 
        `content.ilike.%${keyword}%`
      ).join(',');
      
      const { data: chunks, error: searchError } = await supabase
        .from('code_chunks')
        .select('file_path, content')
        .eq('repo_id', repo.id)
        .or(searchConditions)
        .limit(15);
      
      if (!searchError && chunks) {
        relevantChunks = chunks;
      }
    }
    
    // If no keyword matches, get a sample of chunks
    if (relevantChunks.length === 0) {
      const { data: sampleChunks } = await supabase
        .from('code_chunks')
        .select('file_path, content')
        .eq('repo_id', repo.id)
        .limit(10);
      
      relevantChunks = sampleChunks || [];
    }

    console.log(`Found ${relevantChunks.length} relevant chunks`);

    // Build context from chunks
    const codeContext = relevantChunks
      .map(chunk => chunk.content)
      .join('\n\n---\n\n');

    // Build conversation messages
    const messages = [
      {
        role: 'system',
        content: `You are an expert code assistant helping users understand a GitHub repository: ${repo.repo_name}.

You have access to relevant code snippets from the repository. Use this context to answer questions accurately.
When referencing code, mention the file path. Be concise but thorough.
If you're not sure about something, say so rather than guessing.

Repository: ${repo.repo_name}
Total indexed chunks: ${count}

Relevant code context:
${codeContext || 'No specific code context available for this query.'}`
      },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: message }
    ];

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: false
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI response failed');
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || 'I could not generate a response.';

    // Return files referenced for transparency
    const filesReferenced = [...new Set(relevantChunks.map(c => c.file_path))];

    return new Response(
      JSON.stringify({ 
        response,
        filesReferenced,
        chunksUsed: relevantChunks.length
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
