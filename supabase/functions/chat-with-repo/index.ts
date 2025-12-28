import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractKeywords(message: string): string[] {
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
    'explain', 'tell', 'show', 'find', 'work', 'works', 'working', 'use', 'using',
    'code', 'codebase', 'repository', 'project', 'file', 'files'
  ]);
  
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Extract code patterns
  const codePatterns = message.match(/[A-Z][a-z]+[A-Z][a-zA-Z]*/g) || []; // CamelCase
  const snakeCase = message.match(/[a-z]+_[a-z_]+/g) || []; // snake_case
  const dotPatterns = message.match(/\w+\.\w+/g) || []; // file.ext or obj.method
  
  return [...new Set([
    ...words, 
    ...codePatterns.map(p => p.toLowerCase()), 
    ...snakeCase,
    ...dotPatterns.map(p => p.toLowerCase())
  ])];
}

// Score chunks based on keyword relevance - PRIORITIZE CODE over docs
function scoreChunk(chunk: any, keywords: string[]): number {
  let score = 0;
  const content = chunk.content.toLowerCase();
  const filePath = chunk.file_path.toLowerCase();
  const metadata = chunk.metadata || {};
  
  for (const keyword of keywords) {
    // Exact matches in content
    const contentMatches = (content.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += contentMatches * 3;
    
    // Partial matches
    if (content.includes(keyword)) {
      score += 2;
    }
    
    // Matches in file path are valuable
    if (filePath.includes(keyword)) {
      score += 8;
    }
  }
  
  // CRITICAL: Boost code files OVER documentation
  // Notebooks with code cells get highest priority
  if (metadata.cellType === 'code') {
    score += 25; // Big boost for actual code cells
  }
  
  // Code files get priority
  if (filePath.endsWith('.py')) score += 20;
  if (filePath.endsWith('.ipynb') && metadata.cellType === 'code') score += 20;
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) score += 18;
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) score += 18;
  if (filePath.endsWith('.java') || filePath.endsWith('.go') || filePath.endsWith('.rs')) score += 18;
  if (filePath.endsWith('.cpp') || filePath.endsWith('.c')) score += 15;
  
  // Config files moderate priority
  if (filePath.endsWith('.json') || filePath.endsWith('.yaml') || filePath.endsWith('.toml')) score += 5;
  
  // README gets LOWER priority for implementation questions (de-boost)
  if (filePath.includes('readme')) score -= 5;
  if (metadata.cellType === 'markdown' && filePath.endsWith('.ipynb')) score -= 3;
  
  // Boost based on code patterns
  if (metadata.hasFunctions) score += 5;
  if (metadata.hasClasses) score += 8;
  if (metadata.hasImports) score += 3;
  if (metadata.hasExports) score += 3;
  
  // Boost important file names
  if (filePath.includes('main.') || filePath.includes('app.') || filePath.includes('index.')) score += 10;
  if (filePath.includes('/src/') || filePath.startsWith('src/')) score += 5;
  
  return Math.max(0, score);
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
      const metadata = repo.metadata as any || {};
      return new Response(
        JSON.stringify({ 
          error: 'Repository is currently being indexed. Please wait.',
          code: 'INDEXING_IN_PROGRESS',
          progress: metadata.progress || 0
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

    // Get ALL chunks for this repo
    const { data: allChunks, error: chunksError } = await supabase
      .from('code_chunks')
      .select('id, file_path, content, chunk_index, metadata')
      .eq('repo_id', repo.id);

    if (chunksError || !allChunks || allChunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No code chunks available. Please re-index the repository.',
          code: 'NO_CHUNKS',
          needsIndexing: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allChunks.length} total chunks for repo`);

    // Extract keywords and score chunks
    const keywords = extractKeywords(message);
    console.log('Searching with keywords:', keywords);

    // Score all chunks
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      score: scoreChunk(chunk, keywords)
    }));

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Take top chunks, prioritizing diversity of files
    const seenFiles = new Set<string>();
    const selectedChunks: typeof scoredChunks = [];
    
    // First pass: get top-scoring chunks with file diversity
    for (const chunk of scoredChunks) {
      if (selectedChunks.length >= 20) break;
      
      const fileCount = [...seenFiles].filter(f => f === chunk.file_path).length;
      // Allow up to 5 chunks per file
      if (fileCount < 5) {
        selectedChunks.push(chunk);
        seenFiles.add(chunk.file_path);
      }
    }
    
    // If we still have room, add more top-scoring chunks regardless of file
    if (selectedChunks.length < 15) {
      for (const chunk of scoredChunks) {
        if (selectedChunks.length >= 20) break;
        if (!selectedChunks.includes(chunk)) {
          selectedChunks.push(chunk);
        }
      }
    }

    console.log(`Selected ${selectedChunks.length} chunks for context`);

    // Build context with file grouping
    const fileChunks = new Map<string, Array<{content: string; score: number; metadata: any}>>();
    for (const chunk of selectedChunks) {
      const existing = fileChunks.get(chunk.file_path) || [];
      existing.push({ content: chunk.content, score: chunk.score, metadata: chunk.metadata });
      fileChunks.set(chunk.file_path, existing);
    }

    // Sort files by total score (code files should rank higher)
    const sortedFiles = [...fileChunks.entries()].sort((a, b) => {
      const aScore = a[1].reduce((sum, c) => sum + c.score, 0);
      const bScore = b[1].reduce((sum, c) => sum + c.score, 0);
      return bScore - aScore;
    });

    let codeContext = '';
    for (const [filePath, contents] of sortedFiles) {
      const fileType = contents[0]?.metadata?.cellType === 'code' ? '(code)' : 
                       contents[0]?.metadata?.cellType === 'markdown' ? '(markdown)' : '';
      codeContext += `\n### File: ${filePath} ${fileType}\n`;
      codeContext += contents.map(c => c.content).join('\n\n');
      codeContext += '\n\n---\n';
    }

    // Get unique files referenced
    const filesReferenced = sortedFiles.map(([path]) => path);
    const uniqueFiles = [...new Set(allChunks.map(c => c.file_path))];

    // Build conversation messages
    const systemPrompt = `You are an expert code assistant analyzing the GitHub repository: ${repo.repo_name}.

You have access to ${allChunks.length} indexed code chunks from ${uniqueFiles.length} files in this repository. Below are the most relevant code sections based on the user's question.

IMPORTANT GUIDELINES:
1. Base your answers ONLY on the code provided below. Do not make assumptions about code you haven't seen.
2. When referencing code, always mention the specific file path.
3. For implementation questions, focus on the ACTUAL CODE, not just documentation.
4. If the relevant code isn't in the provided context, say "I don't see the implementation for that in the indexed code."
5. Be specific about function names, class names, and line numbers when possible.
6. Explain the code clearly, focusing on how it works and why.

Repository: ${repo.repo_name}
Total indexed files: ${uniqueFiles.length}
Total chunks: ${allChunks.length}
Files in current context: ${filesReferenced.length}

RELEVANT CODE SECTIONS (sorted by relevance):
${codeContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6),
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

    return new Response(
      JSON.stringify({ 
        response,
        filesReferenced,
        chunksUsed: selectedChunks.length,
        totalChunks: allChunks.length,
        totalFiles: uniqueFiles.length,
        keywordsMatched: keywords.slice(0, 10)
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
