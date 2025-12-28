import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stop words for keyword extraction
const STOP_WORDS = new Set([
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
  'code', 'codebase', 'repository', 'project', 'file', 'files', 'about', 'like',
  'want', 'know', 'understand', 'see', 'look', 'looking', 'please', 'help'
]);

// Query expansion for common programming concepts
const QUERY_EXPANSIONS: Record<string, string[]> = {
  'auth': ['authentication', 'login', 'signup', 'session', 'token', 'jwt', 'oauth', 'password', 'user'],
  'authentication': ['auth', 'login', 'signup', 'session', 'token', 'jwt', 'oauth', 'password'],
  'database': ['db', 'sql', 'query', 'table', 'model', 'schema', 'orm', 'supabase', 'postgres'],
  'api': ['endpoint', 'route', 'request', 'response', 'rest', 'fetch', 'http', 'server'],
  'component': ['react', 'jsx', 'tsx', 'props', 'state', 'hook', 'render', 'ui'],
  'state': ['useState', 'redux', 'context', 'store', 'reducer', 'zustand'],
  'style': ['css', 'tailwind', 'styled', 'className', 'theme', 'design'],
  'test': ['testing', 'jest', 'vitest', 'spec', 'unit', 'integration', 'mock'],
  'error': ['exception', 'catch', 'try', 'throw', 'handle', 'debug', 'bug', 'fix'],
  'deploy': ['deployment', 'build', 'production', 'ci', 'cd', 'docker', 'vercel', 'netlify'],
};

function extractKeywords(message: string): string[] {
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  
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

function expandQuery(keywords: string[]): string[] {
  const expanded = new Set(keywords);
  
  for (const keyword of keywords) {
    // Add expansions for known concepts
    if (QUERY_EXPANSIONS[keyword]) {
      QUERY_EXPANSIONS[keyword].forEach(exp => expanded.add(exp));
    }
    
    // Check if any expansion key is contained in the keyword
    for (const [key, expansions] of Object.entries(QUERY_EXPANSIONS)) {
      if (keyword.includes(key) || key.includes(keyword)) {
        expansions.forEach(exp => expanded.add(exp));
      }
    }
  }
  
  return [...expanded];
}

// Generate embedding for a query using OpenAI
async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[] | null> {
  if (!apiKey) return null;
  
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query.substring(0, 8000),
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0]?.embedding || null;
  } catch (error) {
    console.error("Error generating query embedding:", error);
    return null;
  }
}

// Score chunks based on keyword relevance
function scoreChunkByKeywords(chunk: any, keywords: string[]): number {
  let score = 0;
  const content = chunk.content.toLowerCase();
  const filePath = chunk.file_path.toLowerCase();
  const metadata = chunk.metadata || {};
  
  for (const keyword of keywords) {
    // Exact word matches in content
    const contentMatches = (content.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += contentMatches * 3;
    
    // Partial matches
    if (content.includes(keyword)) score += 2;
    
    // Matches in file path are very valuable
    if (filePath.includes(keyword)) score += 10;
    
    // Check functions and classes in metadata
    if (metadata.functions?.some((f: string) => f.toLowerCase().includes(keyword))) score += 8;
    if (metadata.classes?.some((c: string) => c.toLowerCase().includes(keyword))) score += 8;
  }
  
  // Boost actual code over documentation
  if (metadata.cellType === 'code') score += 25;
  if (/\.(py|ts|tsx|js|jsx)$/.test(filePath)) score += 20;
  if (/\.(java|go|rs|cpp|c)$/.test(filePath)) score += 18;
  if (/\.(json|yaml|toml)$/.test(filePath)) score += 5;
  
  // De-boost docs
  if (/readme|license|contributing/i.test(filePath)) score -= 10;
  if (metadata.cellType === 'markdown') score -= 5;
  
  // Boost based on code patterns
  if (metadata.hasFunctions) score += 5;
  if (metadata.hasClasses) score += 8;
  if (metadata.hasExports) score += 5;
  
  // Boost entry points
  if (/main\.|app\.|index\./.test(filePath)) score += 10;
  if (/\/src\/|^src\//.test(filePath)) score += 5;
  
  // Use importance score if available
  if (metadata.importanceScore) score += metadata.importanceScore / 5;
  
  return Math.max(0, score);
}

// Hybrid search: combine vector similarity with keyword scoring
async function hybridSearch(
  supabase: any,
  repoId: string,
  query: string,
  keywords: string[],
  queryEmbedding: number[] | null,
  limit: number = 15
): Promise<any[]> {
  // Get all chunks for this repo
  const { data: allChunks, error: chunksError } = await supabase
    .from('code_chunks')
    .select('id, file_path, content, chunk_index, metadata, embedding')
    .eq('repo_id', repoId);

  if (chunksError || !allChunks || allChunks.length === 0) {
    return [];
  }

  console.log(`Hybrid search across ${allChunks.length} chunks`);

  // Expand keywords for better recall
  const expandedKeywords = expandQuery(keywords);
  console.log(`Keywords: ${keywords.join(', ')} -> Expanded: ${expandedKeywords.slice(0, 15).join(', ')}`);

  // Score each chunk
  const scoredChunks = allChunks.map((chunk: any) => {
    let keywordScore = scoreChunkByKeywords(chunk, expandedKeywords);
    let vectorScore = 0;

    // Calculate vector similarity if embeddings are available
    if (queryEmbedding && chunk.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      vectorScore = similarity * 100; // Scale to 0-100
    }

    // Combine scores (weighted average)
    // If vector search is available, weight it heavily
    const hasVectorSearch = queryEmbedding && chunk.embedding;
    const combinedScore = hasVectorSearch
      ? (vectorScore * 0.6 + keywordScore * 0.4) // 60% vector, 40% keyword
      : keywordScore;

    return {
      ...chunk,
      keywordScore,
      vectorScore,
      combinedScore,
    };
  });

  // Sort by combined score
  scoredChunks.sort((a: any, b: any) => b.combinedScore - a.combinedScore);

  // Select top chunks with file diversity
  const seenFiles = new Map<string, number>();
  const selected: any[] = [];
  
  for (const chunk of scoredChunks) {
    if (selected.length >= limit) break;
    
    const fileCount = seenFiles.get(chunk.file_path) || 0;
    // Allow up to 4 chunks per file
    if (fileCount < 4) {
      selected.push(chunk);
      seenFiles.set(chunk.file_path, fileCount + 1);
    }
  }

  // Fill remaining slots if needed
  if (selected.length < limit) {
    for (const chunk of scoredChunks) {
      if (selected.length >= limit) break;
      if (!selected.includes(chunk)) {
        selected.push(chunk);
      }
    }
  }

  return selected;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Build structured context for the AI
function buildStructuredContext(chunks: any[], repoName: string): string {
  // Group chunks by file
  const fileChunks = new Map<string, any[]>();
  for (const chunk of chunks) {
    const existing = fileChunks.get(chunk.file_path) || [];
    existing.push(chunk);
    fileChunks.set(chunk.file_path, existing);
  }

  // Sort files by total score
  const sortedFiles = [...fileChunks.entries()].sort((a, b) => {
    const aScore = a[1].reduce((sum: number, c: any) => sum + c.combinedScore, 0);
    const bScore = b[1].reduce((sum: number, c: any) => sum + c.combinedScore, 0);
    return bScore - aScore;
  });

  let context = '';
  for (const [filePath, chunks] of sortedFiles) {
    const metadata = chunks[0]?.metadata || {};
    const functions = metadata.functions?.join(', ') || '';
    const classes = metadata.classes?.join(', ') || '';
    
    context += `\n### File: ${filePath}`;
    if (functions) context += `\nFunctions: ${functions}`;
    if (classes) context += `\nClasses: ${classes}`;
    context += '\n```\n';
    
    // Sort chunks by chunk_index within file
    chunks.sort((a: any, b: any) => a.chunk_index - b.chunk_index);
    context += chunks.map((c: any) => c.content).join('\n\n');
    context += '\n```\n\n---\n';
  }

  return context;
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

    // TODO: Configure an AI service API key (e.g., OPENAI_API_KEY, ANTHROPIC_API_KEY)
    // This function requires an AI service for chat completions
    const AI_API_KEY = Deno.env.get('AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY'); // Used for embeddings only
    
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service API key is not configured. Please set AI_API_KEY or OPENAI_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Extract keywords from the message
    const keywords = extractKeywords(message);
    console.log('Searching with keywords:', keywords);

    // Generate query embedding for semantic search
    let queryEmbedding: number[] | null = null;
    if (OPENAI_API_KEY) {
      // Expand the query for better embedding
      const expandedQuery = `${message} ${expandQuery(keywords).join(' ')}`;
      queryEmbedding = await generateQueryEmbedding(expandedQuery, OPENAI_API_KEY);
      console.log('Generated query embedding:', !!queryEmbedding);
    }

    // Perform hybrid search
    const selectedChunks = await hybridSearch(
      supabase,
      repo.id,
      message,
      keywords,
      queryEmbedding,
      15
    );

    if (selectedChunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No code chunks available. Please re-index the repository.',
          code: 'NO_CHUNKS',
          needsIndexing: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Selected ${selectedChunks.length} chunks for context (vector: ${!!queryEmbedding})`);

    // Build structured context
    const codeContext = buildStructuredContext(selectedChunks, repo.repo_name);
    const filesReferenced = [...new Set(selectedChunks.map((c: any) => c.file_path))];

    // Get total stats
    const { count: totalChunks } = await supabase
      .from('code_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('repo_id', repo.id);

    const { data: uniqueFilesData } = await supabase
      .from('code_chunks')
      .select('file_path')
      .eq('repo_id', repo.id);
    
    const uniqueFiles = [...new Set((uniqueFilesData || []).map((c: any) => c.file_path))];

    // Build enhanced system prompt
    const systemPrompt = `You are an expert code assistant specializing in analyzing and explaining codebases. You are analyzing the GitHub repository: **${repo.repo_name}**.

## Your Capabilities
- You have access to ${totalChunks || 0} indexed code chunks from ${uniqueFiles.length} files
- Below are the ${selectedChunks.length} most relevant code sections for this question
- You can explain code structure, architecture, patterns, and implementation details

## Guidelines for Responses

### DO:
1. **Be specific**: Always reference exact file paths, function names, and line numbers when available
2. **Show code**: Include relevant code snippets when explaining functionality
3. **Explain context**: Describe how pieces of code relate to each other
4. **Be helpful**: If you see related functionality, mention it proactively
5. **Be honest**: If the answer isn't in the provided code, say so clearly

### DON'T:
1. Make up code or functionality that isn't shown
2. Assume implementation details not visible in the context
3. Ignore the actual code in favor of generic explanations
4. Provide outdated or incorrect information about libraries

## Response Format
- Use markdown for code blocks with appropriate language tags
- Use bullet points for lists of features or patterns
- Bold important file paths and function names
- Keep explanations clear and concise

## Available Context
Repository: ${repo.repo_name}
Files in context: ${filesReferenced.length}
Search method: ${queryEmbedding ? 'Semantic + Keyword (Hybrid)' : 'Keyword only'}

---
## Relevant Code Sections
${codeContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep more context
      { role: 'user', content: message }
    ];

    // TODO: Replace with your preferred AI service endpoint
    // Example: OpenAI: https://api.openai.com/v1/chat/completions
    // Example: Anthropic: https://api.anthropic.com/v1/messages
    const AI_API_URL = Deno.env.get('AI_API_URL') || 'https://api.openai.com/v1/chat/completions';
    
    const aiResponse = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') || 'gpt-4',
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
        totalChunks: totalChunks || 0,
        totalFiles: uniqueFiles.length,
        keywordsMatched: keywords.slice(0, 10),
        searchMethod: queryEmbedding ? 'hybrid' : 'keyword',
        topScores: selectedChunks.slice(0, 5).map((c: any) => ({
          file: c.file_path,
          score: Math.round(c.combinedScore),
          vector: Math.round(c.vectorScore || 0),
          keyword: Math.round(c.keywordScore || 0),
        }))
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
