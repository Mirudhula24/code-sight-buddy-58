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
  '.json', '.yaml', '.yml', '.md', '.css', '.scss', '.html'
];

// Directories to skip
const SKIP_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 
  'vendor', 'target', '.idea', '.vscode', 'coverage', '.nyc_output'
];

// Files to skip
const SKIP_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  '.DS_Store', 'thumbs.db'
];

function shouldProcessFile(path: string): boolean {
  // Skip directories
  for (const dir of SKIP_DIRS) {
    if (path.includes(`/${dir}/`) || path.startsWith(`${dir}/`)) {
      return false;
    }
  }
  
  // Skip specific files
  const fileName = path.split('/').pop() || '';
  if (SKIP_FILES.includes(fileName)) {
    return false;
  }
  
  // Check extension
  return CODE_EXTENSIONS.some(ext => path.endsWith(ext));
}

function chunkContent(content: string, filePath: string, maxChunkSize = 800): Array<{ content: string; index: number }> {
  const chunks: Array<{ content: string; index: number }> = [];
  
  // If content is small enough, keep as single chunk
  if (content.length <= maxChunkSize) {
    chunks.push({ content: `// File: ${filePath}\n${content}`, index: 0 });
    return chunks;
  }
  
  // Split by lines to avoid breaking in middle of code
  const lines = content.split('\n');
  let currentChunk = `// File: ${filePath}\n`;
  let chunkIndex = 0;
  
  for (const line of lines) {
    // If adding this line would exceed limit, save current chunk and start new one
    if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 50) {
      chunks.push({ content: currentChunk.trim(), index: chunkIndex });
      chunkIndex++;
      currentChunk = `// File: ${filePath} (continued)\n`;
    }
    currentChunk += line + '\n';
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim().length > 20) {
    chunks.push({ content: currentChunk.trim(), index: chunkIndex });
  }
  
  return chunks;
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

    // Extract owner/repo from GitHub URL
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GitHub API headers
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
      // Clear existing chunks for re-indexing
      await supabase
        .from('code_chunks')
        .delete()
        .eq('repo_id', repoId);
      
      // Update status
      await supabase
        .from('repositories')
        .update({ ingestion_status: 'indexing', chunks_count: 0 })
        .eq('id', repoId);
    } else {
      // Create new repository record
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
    const files = treeData.tree
      ?.filter((item: any) => item.type === 'blob' && shouldProcessFile(item.path))
      ?.slice(0, 100) || []; // Limit to 100 files

    console.log(`Found ${files.length} files to index`);

    let totalChunks = 0;
    let processedFiles = 0;
    const batchSize = 10;

    // Process files in batches
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
          
          // Skip very large files or binary-looking content
          if (content.length > 50000 || content.includes('\x00')) {
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
        chunks.map((chunk: { content: string; index: number }) => ({
          repo_id: repoId,
          file_path: batch[idx].path,
          content: chunk.content,
          chunk_index: chunk.index
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
            totalFiles: files.length
          }
        })
        .eq('id', repoId);
      
      console.log(`Progress: ${processedFiles}/${files.length} files, ${totalChunks} chunks`);
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
