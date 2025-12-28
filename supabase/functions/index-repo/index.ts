import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// File extensions to index (lowercase)
const CODE_EXTENSIONS = [
  ".ipynb", ".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".go", ".rs", ".rb",
  ".php", ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala", ".vue",
  ".svelte", ".json", ".yaml", ".yml", ".toml", ".xml", ".md", ".txt", ".sql",
  ".sh", ".css", ".scss", ".html",
];

const SKIP_DIRS = [
  "node_modules", ".git", "dist", "build", ".next", "__pycache__", "vendor",
  "target", ".idea", ".vscode", "coverage", ".nyc_output", ".cache", ".temp",
  "tmp", "logs", "test-results", ".husky",
];

const SKIP_FILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  ".ds_store", "thumbs.db",
];

const MAX_FILE_BYTES = 1_000_000; // 1MB
const MAX_CHUNK_CHARS = 1200; // Optimal for embeddings (was 1800)
const CHUNK_OVERLAP = 200; // Character overlap between chunks
const EMBEDDING_BATCH_SIZE = 50; // Batch embeddings for efficiency

function shouldProcessFile(path: string): boolean {
  const lower = path.toLowerCase();
  for (const dir of SKIP_DIRS) {
    if (lower.includes(`/${dir}/`) || lower.startsWith(`${dir}/`)) return false;
  }
  const fileName = lower.split("/").pop() || "";
  if (SKIP_FILES.includes(fileName)) return false;
  if (/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|tar|gz|exe|bin)$/.test(lower)) return false;
  return CODE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function detectLanguage(filePath: string): string {
  const lower = filePath.toLowerCase();
  const langMap: Record<string, string> = {
    ".ipynb": "notebook", ".py": "python", ".ts": "typescript", ".tsx": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".java": "java", ".go": "go",
    ".rs": "rust", ".cpp": "cpp", ".hpp": "cpp", ".c": "c", ".h": "c",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".md": "markdown",
    ".toml": "toml", ".sql": "sql", ".css": "css", ".scss": "scss", ".html": "html",
  };
  for (const [ext, lang] of Object.entries(langMap)) {
    if (lower.endsWith(ext)) return lang;
  }
  return "text";
}

function base64ToString(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// Extract function/class names from code
function extractCodeElements(content: string, language: string): {
  functions: string[];
  classes: string[];
  imports: string[];
  exports: string[];
} {
  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];
  const exports: string[] = [];

  // Function patterns by language
  const funcPatterns: RegExp[] = [
    /(?:function|def|fn|func)\s+(\w+)/g, // JS/Python/Rust/Go
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g, // Arrow functions
    /(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>/g, // Object method arrows
    /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g, // Class methods
  ];

  // Class patterns
  const classPatterns: RegExp[] = [
    /(?:class|interface|struct|enum|trait)\s+(\w+)/g,
  ];

  for (const pattern of funcPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && !['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
        functions.push(match[1]);
      }
    }
  }

  for (const pattern of classPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
  }

  // Import patterns
  const importMatches = content.match(/^(?:import|from|require|use|using)\s+.+$/gm) || [];
  imports.push(...importMatches.slice(0, 10).map(i => i.substring(0, 100)));

  // Export patterns
  const exportMatches = content.match(/^(?:export|module\.exports)\s+.+$/gm) || [];
  exports.push(...exportMatches.slice(0, 10).map(e => e.substring(0, 100)));

  return {
    functions: [...new Set(functions)].slice(0, 20),
    classes: [...new Set(classes)].slice(0, 10),
    imports: imports.slice(0, 10),
    exports: exports.slice(0, 10),
  };
}

// Calculate importance score for a chunk
function calculateImportanceScore(content: string, filePath: string, metadata: any): number {
  let score = 50; // Base score

  // Boost entry points
  if (/main\.|index\.|app\.|server\./i.test(filePath)) score += 20;
  if (/\/src\/|^src\//i.test(filePath)) score += 10;

  // Boost based on code patterns
  if (metadata.functions?.length > 0) score += metadata.functions.length * 3;
  if (metadata.classes?.length > 0) score += metadata.classes.length * 5;
  if (metadata.hasExports) score += 10;

  // Boost code cells in notebooks
  if (metadata.cellType === 'code') score += 15;

  // De-boost docs/config
  if (/readme|license|contributing/i.test(filePath)) score -= 20;
  if (metadata.cellType === 'markdown') score -= 10;

  return Math.max(0, Math.min(100, score));
}

type ChunkInsert = {
  repo_id: string;
  file_path: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  embedding?: number[];
};

// Smart chunking that keeps functions together
function smartChunkCode(opts: {
  filePath: string;
  content: string;
  language: string;
  maxChars?: number;
  overlap?: number;
}): Array<{
  text: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  meta: Record<string, unknown>;
}> {
  const { filePath, content, language, maxChars = MAX_CHUNK_CHARS, overlap = CHUNK_OVERLAP } = opts;
  const lines = content.split("\n");
  const chunks: Array<{
    text: string;
    startLine: number;
    endLine: number;
    chunkIndex: number;
    meta: Record<string, unknown>;
  }> = [];

  // Extract code elements from full content
  const codeElements = extractCodeElements(content, language);
  
  const baseMeta = {
    language,
    fileType: filePath.split(".").pop() || "unknown",
    hasImports: codeElements.imports.length > 0,
    hasExports: codeElements.exports.length > 0,
    hasFunctions: codeElements.functions.length > 0,
    hasClasses: codeElements.classes.length > 0,
    allFunctions: codeElements.functions,
    allClasses: codeElements.classes,
  };

  // Find function/class boundaries
  const boundaries: number[] = [0];
  const blockPatterns = [
    /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|const|let|var|def|fn|func|pub|impl)/,
    /^(?:export\s+)?(?:default\s+)?(?:function|class)/,
    /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:async\s+)?(?:\w+\s+)?\w+\s*\(/,
  ];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trimStart();
    if (blockPatterns.some(p => p.test(line)) && lines[i].search(/\S/) === 0) {
      boundaries.push(i);
    }
  }
  boundaries.push(lines.length);

  let chunkIndex = 0;
  let currentStart = 0;
  let currentText = `// File: ${filePath}\n`;
  let currentLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const potentialText = currentText + line + "\n";

    // Check if we hit a natural boundary and chunk is large enough
    const isAtBoundary = boundaries.includes(i) && currentLineCount > 5;
    const isOverLimit = potentialText.length > maxChars;

    if ((isAtBoundary || isOverLimit) && currentLineCount > 0) {
      // Extract functions/classes in this specific chunk
      const chunkElements = extractCodeElements(currentText, language);
      const importanceScore = calculateImportanceScore(currentText, filePath, {
        ...baseMeta,
        functions: chunkElements.functions,
        classes: chunkElements.classes,
      });

      chunks.push({
        text: currentText.trimEnd(),
        startLine: currentStart + 1,
        endLine: currentStart + currentLineCount,
        chunkIndex,
        meta: {
          ...baseMeta,
          functions: chunkElements.functions,
          classes: chunkElements.classes,
          startLine: currentStart + 1,
          endLine: currentStart + currentLineCount,
          importanceScore,
        },
      });

      // Start new chunk with overlap
      const overlapLines = Math.min(5, Math.floor(overlap / 40)); // ~40 chars per line
      const overlapStart = Math.max(0, i - overlapLines);
      const overlapContent = lines.slice(overlapStart, i).join("\n");
      
      chunkIndex++;
      currentStart = overlapStart;
      currentLineCount = i - overlapStart;
      currentText = `// File: ${filePath} (chunk ${chunkIndex + 1})\n${overlapContent}\n`;
    }

    currentText += line + "\n";
    currentLineCount++;
  }

  // Don't forget the last chunk
  if (currentText.trim().length > filePath.length + 20) {
    const chunkElements = extractCodeElements(currentText, language);
    const importanceScore = calculateImportanceScore(currentText, filePath, {
      ...baseMeta,
      functions: chunkElements.functions,
      classes: chunkElements.classes,
    });

    chunks.push({
      text: currentText.trimEnd(),
      startLine: currentStart + 1,
      endLine: lines.length,
      chunkIndex,
      meta: {
        ...baseMeta,
        functions: chunkElements.functions,
        classes: chunkElements.classes,
        startLine: currentStart + 1,
        endLine: lines.length,
        importanceScore,
      },
    });
  }

  return chunks;
}

function parseNotebookToChunks(filePath: string, notebookText: string): Array<{ text: string; meta: Record<string, unknown>; order: number }> {
  const chunks: Array<{ text: string; meta: Record<string, unknown>; order: number }> = [];
  let json: any;
  try {
    json = JSON.parse(notebookText);
  } catch {
    return [];
  }

  const kernelLang = json?.metadata?.kernelspec?.language || json?.metadata?.language_info?.name || "python";
  const cells: any[] = Array.isArray(json?.cells) ? json.cells : [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellType = String(cell?.cell_type || "unknown");
    const executionCount = cell?.execution_count ?? null;
    const source = Array.isArray(cell?.source) ? cell.source.join("") : String(cell?.source || "");
    const text = source.trim();
    if (!text) continue;

    const language = cellType === "code" ? String(kernelLang) : "markdown";
    const byLines = smartChunkCode({
      filePath,
      content: text,
      language,
      maxChars: MAX_CHUNK_CHARS,
      overlap: CHUNK_OVERLAP,
    });

    for (const part of byLines) {
      const codeElements = extractCodeElements(part.text, language);
      chunks.push({
        text: `// File: ${filePath}\n// Notebook cell ${i + 1}/${cells.length} (${cellType})\n${part.text}`,
        meta: {
          ...part.meta,
          notebook: true,
          cellType,
          cellIndex: i,
          executionCount,
          functions: codeElements.functions,
          classes: codeElements.classes,
        },
        order: i * 1000 + part.chunkIndex,
      });
    }
  }

  return chunks;
}

// Generate embeddings using OpenAI
async function generateEmbeddings(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  if (!apiKey) {
    console.log("No OpenAI API key, skipping embeddings");
    return texts.map(() => null);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts.map(t => t.substring(0, 8000)), // Truncate if needed
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Embedding API error:", response.status, error);
      return texts.map(() => null);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return texts.map(() => null);
  }
}

async function getDefaultBranch(owner: string, repo: string, headers: Record<string, string>) {
  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`GitHub repo metadata failed: ${resp.status} ${t}`);
  }
  const data = await resp.json();
  return String(data?.default_branch || "main");
}

async function getTreeSha(owner: string, repo: string, branch: string, headers: Record<string, string>) {
  const branchResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`, { headers });
  if (!branchResp.ok) {
    const t = await branchResp.text();
    throw new Error(`GitHub branch fetch failed: ${branchResp.status} ${t}`);
  }
  const branchData = await branchResp.json();
  const treeSha = branchData?.commit?.commit?.tree?.sha as string | undefined;
  if (treeSha) return treeSha;

  const commitSha = branchData?.commit?.sha as string | undefined;
  if (!commitSha) throw new Error("Could not resolve commit SHA for default branch");

  const commitResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`, { headers });
  if (!commitResp.ok) {
    const t = await commitResp.text();
    throw new Error(`GitHub commit fetch failed: ${commitResp.status} ${t}`);
  }
  const commitData = await commitResp.json();
  const treeSha2 = commitData?.tree?.sha as string | undefined;
  if (!treeSha2) throw new Error("Could not resolve tree SHA from commit");
  return treeSha2;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repositoryUrl, forceReindex = true } = await req.json();

    if (!repositoryUrl) {
      return new Response(JSON.stringify({ error: "Repository URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (!match) {
      return new Response(JSON.stringify({ error: "Invalid GitHub URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [, ownerRaw, repoRaw] = match;
    const owner = ownerRaw;
    const repo = repoRaw.replace(/\.git$/i, "");

    console.log(`Starting indexing for ${owner}/${repo} with embeddings`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    const githubHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CodeSight-Indexer",
    };
    if (GITHUB_TOKEN) githubHeaders.Authorization = `token ${GITHUB_TOKEN}`;

    // Upsert repository row
    const { data: repoRow, error: repoUpsertError } = await supabase
      .from("repositories")
      .upsert(
        {
          repo_url: repositoryUrl,
          repo_name: `${owner}/${repo}`,
          ingestion_status: "indexing",
          chunks_count: 0,
          metadata: {
            progress: 0,
            filesProcessed: 0,
            totalFiles: 0,
            currentFile: null,
            failedFilesCount: 0,
            failedFilesSample: [],
            embeddingsEnabled: !!OPENAI_API_KEY,
          },
        },
        { onConflict: "repo_url" }
      )
      .select("*")
      .single();

    if (repoUpsertError || !repoRow) {
      console.error("Repo upsert error:", repoUpsertError);
      throw repoUpsertError || new Error("Failed to upsert repository row");
    }

    const repoId = repoRow.id as string;

    if (forceReindex) {
      await supabase.from("code_chunks").delete().eq("repo_id", repoId);
    }

    // Resolve default branch + tree sha
    const defaultBranch = await getDefaultBranch(owner, repo, githubHeaders);
    const treeSha = await getTreeSha(owner, repo, defaultBranch, githubHeaders);

    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
      { headers: githubHeaders }
    );

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text();
      console.error("GitHub tree error:", treeResponse.status, errorText);
      await supabase.from("repositories").update({ ingestion_status: "failed" }).eq("id", repoId);
      return new Response(JSON.stringify({ error: `Failed to fetch repository tree: ${treeResponse.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const treeData = await treeResponse.json();
    const allFiles: Array<{ path: string; type: string }> = (treeData?.tree || [])
      .filter((item: any) => item?.type === "blob" && typeof item?.path === "string")
      .map((item: any) => ({ path: item.path as string, type: item.type as string }))
      .filter((item: { path: string; type: string }) => shouldProcessFile(item.path));

    console.log(`Found ${allFiles.length} indexable files`);

    // Prioritize source files
    const files = allFiles.sort((a, b) => {
      const score = (p: string) => {
        const lower = p.toLowerCase();
        if (lower.endsWith(".ipynb")) return 100;
        if (lower.includes("/src/") || lower.startsWith("src/")) return 90;
        if (/\.(py|ts|tsx|js|jsx)$/.test(lower)) return 80;
        if (lower.endsWith(".md")) return 20;
        return 50;
      };
      return score(b.path) - score(a.path);
    });

    await supabase
      .from("repositories")
      .update({
        metadata: {
          ...(repoRow.metadata as any),
          totalFiles: files.length,
          progress: 0,
        },
      })
      .eq("id", repoId);

    let totalChunks = 0;
    let processedFiles = 0;
    let failedFilesCount = 0;
    const failedFilesSample: string[] = [];
    const pendingChunks: ChunkInsert[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = file.path;

      try {
        // Update progress
        if (i % 5 === 0) {
          await supabase
            .from("repositories")
            .update({
              metadata: {
                progress: Math.round((processedFiles / Math.max(1, files.length)) * 100),
                filesProcessed: processedFiles,
                totalFiles: files.length,
                currentFile: filePath,
                failedFilesCount,
                embeddingsEnabled: !!OPENAI_API_KEY,
              },
            })
            .eq("id", repoId);
        }

        const contentResp = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(filePath)}`,
          { headers: githubHeaders }
        );

        if (!contentResp.ok) {
          throw new Error(`contents fetch failed: ${contentResp.status}`);
        }

        const contentJson = await contentResp.json();
        if (Array.isArray(contentJson) || contentJson?.type !== "file") continue;

        const size = Number(contentJson?.size || 0);
        if (size > MAX_FILE_BYTES) {
          console.log(`Skipping large file: ${filePath} (${size} bytes)`);
          continue;
        }

        let text = "";
        if (contentJson?.content && contentJson?.encoding === "base64") {
          text = base64ToString(String(contentJson.content));
        } else if (contentJson?.download_url) {
          const rawResp = await fetch(String(contentJson.download_url), { headers: githubHeaders });
          if (!rawResp.ok) throw new Error(`download_url fetch failed: ${rawResp.status}`);
          text = await rawResp.text();
        } else {
          continue;
        }

        if (text.includes("\x00")) {
          console.log(`Skipping binary content: ${filePath}`);
          continue;
        }

        const language = detectLanguage(filePath);
        let inserts: ChunkInsert[];

        if (filePath.toLowerCase().endsWith(".ipynb")) {
          const nbChunks = parseNotebookToChunks(filePath, text);
          inserts = nbChunks.map((c) => ({
            repo_id: repoId,
            file_path: filePath,
            content: c.text,
            chunk_index: c.order,
            metadata: c.meta,
          }));
        } else {
          const parts = smartChunkCode({ filePath, content: text, language });
          inserts = parts.map((p) => ({
            repo_id: repoId,
            file_path: filePath,
            content: p.text,
            chunk_index: p.chunkIndex,
            metadata: p.meta,
          }));
        }

        pendingChunks.push(...inserts);

        // Batch insert with embeddings when we have enough chunks
        if (pendingChunks.length >= EMBEDDING_BATCH_SIZE) {
          await insertChunksWithEmbeddings(supabase, pendingChunks, OPENAI_API_KEY || "");
          totalChunks += pendingChunks.length;
          pendingChunks.length = 0;
        }

        processedFiles++;

        // Gentle delay to avoid rate limiting
        if (i % 10 === 0) {
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch (e) {
        failedFilesCount++;
        if (failedFilesSample.length < 20) failedFilesSample.push(filePath);
        console.error(`Error processing ${filePath}:`, e);
      }
    }

    // Insert remaining chunks
    if (pendingChunks.length > 0) {
      await insertChunksWithEmbeddings(supabase, pendingChunks, OPENAI_API_KEY || "");
      totalChunks += pendingChunks.length;
    }

    await supabase
      .from("repositories")
      .update({
        ingestion_status: "completed",
        chunks_count: totalChunks,
        metadata: {
          progress: 100,
          filesProcessed: processedFiles,
          totalFiles: files.length,
          currentFile: null,
          failedFilesCount,
          failedFilesSample,
          completedAt: new Date().toISOString(),
          embeddingsEnabled: !!OPENAI_API_KEY,
        },
      })
      .eq("id", repoId);

    console.log(`Indexing complete: ${totalChunks} chunks from ${processedFiles} files (embeddings: ${!!OPENAI_API_KEY})`);

    return new Response(
      JSON.stringify({
        success: true,
        repoId,
        chunksCount: totalChunks,
        filesProcessed: processedFiles,
        totalFiles: files.length,
        failedFilesCount,
        embeddingsEnabled: !!OPENAI_API_KEY,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in index-repo:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Indexing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function insertChunksWithEmbeddings(
  supabase: any,
  chunks: ChunkInsert[],
  apiKey: string
): Promise<void> {
  if (apiKey) {
    const texts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddings(texts, apiKey);
    
    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i]) {
        chunks[i].embedding = embeddings[i]!;
      }
    }
  }

  const { error: insertError } = await supabase.from("code_chunks").insert(chunks);
  if (insertError) {
    console.error("Insert error:", insertError);
  }
}
