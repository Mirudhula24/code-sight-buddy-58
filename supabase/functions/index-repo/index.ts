import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File extensions to index
const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.rb', '.php',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.scala', '.vue', '.svelte',
  '.json', '.yaml', '.yml', '.md', '.css', '.scss', '.html', '.sql', '.sh',
  '.dockerfile', '.env.example', '.toml', '.xml', '.gradle'
];

// Directories to skip
const SKIP_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 
  'vendor', 'target', '.idea', '.vscode', 'coverage', '.nyc_output',
  '.cache', '.temp', 'tmp', 'logs', 'test-results', '.husky'
];

// Files to skip
const SKIP_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  '.DS_Store', 'thumbs.db', '.gitignore', '.npmrc', '.nvmrc'
];

function shouldProcessFile(path: string): boolean {
  for (const dir of SKIP_DIRS) {
    if (path.includes(`/${dir}/`) || path.startsWith(`${dir}/`)) {
      return false;
    }
  }
  
  const fileName = path.split('/').pop() || '';
  if (SKIP_FILES.includes(fileName)) {
    return false;
  }
  
  return CODE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
    'py': 'python', 'java': 'java', 'go': 'go', 'rs': 'rust', 'rb': 'ruby',
    'php': 'php', 'c': 'c', 'cpp': 'cpp', 'h': 'c', 'hpp': 'cpp',
    'cs': 'csharp', 'swift': 'swift', 'kt': 'kotlin', 'scala': 'scala',
    'vue': 'vue', 'svelte': 'svelte', 'json': 'json', 'yaml': 'yaml',
    'yml': 'yaml', 'md': 'markdown', 'css': 'css', 'scss': 'scss',
    'html': 'html', 'sql': 'sql', 'sh': 'shell', 'toml': 'toml'
  };
  return langMap[ext] || 'text';
}

interface Chunk {
  content: string;
  index: number;
  startLine: number;
  endLine: number;
  metadata: {
    language: string;
    fileType: string;
    hasImports: boolean;
    hasExports: boolean;
    hasFunctions: boolean;
    hasClasses: boolean;
  };
}

function chunkContent(content: string, filePath: string, maxChunkSize = 1000, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  const language = detectLanguage(filePath);
  const lines = content.split('\n');
  
  // Detect code patterns
  const hasImports = /^(import|from|require|use|using)\s/m.test(content);
  const hasExports = /^(export|module\.exports|public\s+class)/m.test(content);
  const hasFunctions = /\b(function|def|fn|func|async|=>)\b/.test(content);
  const hasClasses = /\b(class|interface|struct|enum|trait)\b/.test(content);
  
  const baseMetadata = {
    language,
    fileType: filePath.split('.').pop() || 'unknown',
    hasImports,
    hasExports,
    hasFunctions,
    hasClasses
  };
  
  // If content is small enough, keep as single chunk
  if (content.length <= maxChunkSize) {
    chunks.push({
      content: `// File: ${filePath}\n${content}`,
      index: 0,
      startLine: 1,
      endLine: lines.length,
      metadata: baseMetadata
    });
    return chunks;
  }
  
  // Split into overlapping chunks
  let currentChunk = `// File: ${filePath}\n`;
  let chunkIndex = 0;
  let startLine = 1;
  let lineCount = 0;
  let overlapBuffer: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If adding this line would exceed limit, save current chunk
    if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 100) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        startLine,
        endLine: startLine + lineCount - 1,
        metadata: baseMetadata
      });
      
      chunkIndex++;
      startLine = Math.max(1, i - Math.floor(overlap / 50)); // Approximate lines for overlap
      lineCount = 0;
      
      // Start new chunk with overlap from previous
      currentChunk = `// File: ${filePath} (chunk ${chunkIndex + 1})\n`;
      
      // Add overlap from last few lines
      const overlapLines = lines.slice(Math.max(0, i - 5), i);
      if (overlapLines.length > 0) {
        currentChunk += overlapLines.join('\n') + '\n';
      }
    }
    
    currentChunk += line + '\n';
    lineCount++;
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim().length > 50) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      startLine,
      endLine: lines.length,
      metadata: baseMetadata
    });
  }
  
  return chunks;
}

// Generate embeddings using Lovable AI
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    // Use Lovable AI to generate a semantic representation
    // We'll ask it to create a structured summary that we can use for matching
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a code analysis assistant. Given a code snippet, output ONLY a JSON array of exactly 384 numbers between -1 and 1 representing the semantic meaning of the code. Focus on: purpose, patterns, functions, classes, imports, dependencies. Output ONLY the JSON array, nothing else.`
          },
          {
            role: 'user',
            content: text.slice(0, 2000) // Limit input size
          }
        ],
        temperature: 0
      }),
    });

    if (!response.ok) {
      console.log('Embedding generation failed, skipping:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      try {
        // Try to parse the JSON array
        const embedding = JSON.parse(content);
        if (Array.isArray(embedding) && embedding.length === 384) {
          return embedding;
        }
      } catch {
        // If parsing fails, return null
        console.log('Could not parse embedding response');
      }
    }
    
    return null;
  } catch (err) {
    console.error('Embedding error:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repositoryUrl, analysisId } = await req.json();
    
    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: 'Repository URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Invalid GitHub URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');
    
    console.log(`Starting indexing for ${owner}/${repoName}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const githubHeaders: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeSight-Indexer'
    };
    if (GITHUB_TOKEN) {
      githubHeaders['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    // Check or create repository record
    let repoId: string;
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id')
      .eq('repo_url', repositoryUrl)
      .single();

    if (existingRepo) {
      repoId = existingRepo.id;
      await supabase
        .from('code_chunks')
        .delete()
        .eq('repo_id', repoId);
      
      await supabase
        .from('repositories')
        .update({ ingestion_status: 'indexing', chunks_count: 0 })
        .eq('id', repoId);
    } else {
      const { data: newRepo, error: createError } = await supabase
        .from('repositories')
        .insert({
          repo_url: repositoryUrl,
          repo_name: `${owner}/${repoName}`,
          ingestion_status: 'indexing',
          chunks_count: 0
        })
        .select()
        .single();
      
      if (createError) throw createError;
      repoId = newRepo.id;
    }

    // Fetch repository tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`,
      { headers: githubHeaders }
    );

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text();
      console.error('GitHub tree error:', treeResponse.status, errorText);
      
      await supabase
        .from('repositories')
        .update({ ingestion_status: 'failed' })
        .eq('id', repoId);
      
      return new Response(
        JSON.stringify({ error: `Failed to fetch repository: ${treeResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const treeData = await treeResponse.json();
    const allFiles = treeData.tree?.filter((item: any) => 
      item.type === 'blob' && shouldProcessFile(item.path)
    ) || [];
    
    // Sort files by importance (prioritize main source files)
    const priorityOrder = ['README', 'src/', 'app/', 'lib/', 'components/', 'pages/', 'api/'];
    const files = allFiles.sort((a: any, b: any) => {
      const aScore = priorityOrder.findIndex(p => a.path.includes(p));
      const bScore = priorityOrder.findIndex(p => b.path.includes(p));
      return (bScore !== -1 ? bScore : 10) - (aScore !== -1 ? aScore : 10);
    }).slice(0, 150); // Increased limit

    console.log(`Found ${files.length} files to index (from ${allFiles.length} total)`);

    let totalChunks = 0;
    let processedFiles = 0;
    const batchSize = 5; // Smaller batches for stability

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const filePromises = batch.map(async (file: any) => {
        try {
          const contentResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
            { headers: { ...githubHeaders, 'Accept': 'application/vnd.github.v3.raw' } }
          );
          
          if (!contentResponse.ok) {
            console.log(`Skipping ${file.path}: ${contentResponse.status}`);
            return [];
          }
          
          const content = await contentResponse.text();
          
          if (content.length > 100000 || content.includes('\x00')) {
            console.log(`Skipping large/binary file: ${file.path}`);
            return [];
          }
          
          return chunkContent(content, file.path);
        } catch (err) {
          console.error(`Error processing ${file.path}:`, err);
          return [];
        }
      });
      
      const fileChunks = await Promise.all(filePromises);
      
      // Flatten and prepare for insertion
      const chunksToInsert = fileChunks.flatMap((chunks, idx) => 
        chunks.map((chunk: Chunk) => ({
          repo_id: repoId,
          file_path: batch[idx].path,
          content: chunk.content,
          chunk_index: chunk.index,
          metadata: {
            ...chunk.metadata,
            startLine: chunk.startLine,
            endLine: chunk.endLine
          }
        }))
      );
      
      if (chunksToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('code_chunks')
          .insert(chunksToInsert);
        
        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          totalChunks += chunksToInsert.length;
        }
      }
      
      processedFiles += batch.length;
      
      // Update progress
      await supabase
        .from('repositories')
        .update({ 
          chunks_count: totalChunks,
          metadata: { 
            progress: Math.round((processedFiles / files.length) * 100),
            filesProcessed: processedFiles,
            totalFiles: files.length,
            totalAvailableFiles: allFiles.length
          }
        })
        .eq('id', repoId);
      
      console.log(`Progress: ${processedFiles}/${files.length} files, ${totalChunks} chunks`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark as complete
    await supabase
      .from('repositories')
      .update({ 
        ingestion_status: 'completed', 
        chunks_count: totalChunks,
        metadata: {
          filesProcessed: processedFiles,
          totalFiles: files.length,
          totalAvailableFiles: allFiles.length,
          completedAt: new Date().toISOString()
        }
      })
      .eq('id', repoId);

    console.log(`Indexing complete: ${totalChunks} chunks from ${processedFiles} files`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        repoId, 
        chunksCount: totalChunks,
        filesProcessed: processedFiles 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in index-repo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Indexing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
