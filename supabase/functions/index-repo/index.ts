import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// File extensions to index (lowercase)
const CODE_EXTENSIONS = [
  ".ipynb",
  ".py",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".java",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".swift",
  ".kt",
  ".scala",
  ".vue",
  ".svelte",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".md",
  ".txt",
  ".sql",
  ".sh",
  ".css",
  ".scss",
  ".html",
];

const SKIP_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  "vendor",
  "target",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  ".cache",
  ".temp",
  "tmp",
  "logs",
  "test-results",
  ".husky",
];

const SKIP_FILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".ds_store",
  "thumbs.db",
];

const MAX_FILE_BYTES = 1_000_000; // 1MB
const MAX_CHUNK_CHARS = 1800; // keep under 2k including headers

function shouldProcessFile(path: string): boolean {
  const lower = path.toLowerCase();

  for (const dir of SKIP_DIRS) {
    if (lower.includes(`/${dir}/`) || lower.startsWith(`${dir}/`)) return false;
  }

  const fileName = lower.split("/").pop() || "";
  if (SKIP_FILES.includes(fileName)) return false;

  // quick binary/artifact exclusion
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".pdf") ||
    lower.endsWith(".zip") ||
    lower.endsWith(".tar") ||
    lower.endsWith(".gz") ||
    lower.endsWith(".exe") ||
    lower.endsWith(".bin")
  ) {
    return false;
  }

  return CODE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function detectLanguage(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".ipynb")) return "notebook";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".java")) return "java";
  if (lower.endsWith(".go")) return "go";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".cpp") || lower.endsWith(".hpp")) return "cpp";
  if (lower.endsWith(".c") || lower.endsWith(".h")) return "c";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".toml")) return "toml";
  if (lower.endsWith(".sql")) return "sql";
  return "text";
}

function encodePath(path: string): string {
  // encode each segment but keep slashes
  return path.split("/").map(encodeURIComponent).join("/");
}

function base64ToString(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

type ChunkInsert = {
  repo_id: string;
  file_path: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
};

function chunkTextByLines(opts: {
  filePath: string;
  content: string;
  headerPrefix?: string;
  language?: string;
  baseMetadata?: Record<string, unknown>;
  maxChars?: number;
}): Array<{ text: string; startLine: number; endLine: number; chunkIndex: number; meta: Record<string, unknown> }> {
  const { filePath, content, headerPrefix, language, baseMetadata, maxChars } = opts;
  const lines = content.split("\n");
  const max = maxChars ?? MAX_CHUNK_CHARS;

  const header = headerPrefix ?? `// File: ${filePath}`;
  const lang = language ?? detectLanguage(filePath);

  const hasImports = /^(import|from|require|use|using)\s/m.test(content);
  const hasExports = /^(export|module\.exports|public\s+class)\b/m.test(content);
  const hasFunctions = /\b(function|def|fn|func|async|=>)\b/.test(content);
  const hasClasses = /\b(class|interface|struct|enum|trait)\b/.test(content);

  const metaBase: Record<string, unknown> = {
    language: lang,
    fileType: filePath.split(".").pop() || "unknown",
    hasImports,
    hasExports,
    hasFunctions,
    hasClasses,
    ...baseMetadata,
  };

  const out: Array<{ text: string; startLine: number; endLine: number; chunkIndex: number; meta: Record<string, unknown> }> = [];

  let chunkIndex = 0;
  let startLine = 1;
  let current = `${header}\n`;
  let currentLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (current.length + line.length + 1 > max && currentLineCount > 0) {
      out.push({
        text: current.trimEnd(),
        startLine,
        endLine: startLine + currentLineCount - 1,
        chunkIndex,
        meta: metaBase,
      });

      // overlap: keep last ~5 lines
      const overlapLines = lines.slice(Math.max(0, i - 5), i);
      chunkIndex++;
      startLine = Math.max(1, i - overlapLines.length + 1);
      currentLineCount = overlapLines.length;
      current = `${header} (chunk ${chunkIndex + 1})\n${overlapLines.join("\n")}\n`;
    }

    current += line + "\n";
    currentLineCount++;
  }

  if (current.trim().length > header.length + 10) {
    out.push({
      text: current.trimEnd(),
      startLine,
      endLine: lines.length,
      chunkIndex,
      meta: metaBase,
    });
  }

  return out;
}

function parseNotebookToChunks(filePath: string, notebookText: string): Array<{ text: string; meta: Record<string, unknown>; order: number }> {
  const chunks: Array<{ text: string; meta: Record<string, unknown>; order: number }> = [];

  let json: any;
  try {
    json = JSON.parse(notebookText);
  } catch {
    return [];
  }

  const kernelLang =
    json?.metadata?.kernelspec?.language ||
    json?.metadata?.language_info?.name ||
    "python";

  const cells: any[] = Array.isArray(json?.cells) ? json.cells : [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellType = String(cell?.cell_type || "unknown");
    const executionCount = cell?.execution_count ?? null;

    const source = Array.isArray(cell?.source) ? cell.source.join("") : String(cell?.source || "");
    const text = source.trim();
    if (!text) continue;

    const header = `// File: ${filePath}\n// Notebook cell ${i + 1}/${cells.length} (${cellType})`;

    const language = cellType === "code" ? String(kernelLang) : "markdown";

    // chunk within the cell if needed
    const byLines = chunkTextByLines({
      filePath,
      content: text,
      headerPrefix: header,
      language,
      baseMetadata: {
        notebook: true,
        cellType,
        cellIndex: i,
        executionCount,
      },
      maxChars: MAX_CHUNK_CHARS,
    });

    for (const part of byLines) {
      chunks.push({
        text: part.text,
        meta: {
          ...part.meta,
          cellType,
          cellIndex: i,
          executionCount,
          startLine: part.startLine,
          endLine: part.endLine,
        },
        order: i * 1000 + part.chunkIndex,
      });
    }
  }

  return chunks;
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

    console.log(`Starting indexing for ${owner}/${repo}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const githubHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CodeSight-Indexer",
    };
    if (GITHUB_TOKEN) githubHeaders.Authorization = `token ${GITHUB_TOKEN}`;

    // Upsert repository row (avoids duplicate key errors if indexing is triggered twice)
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

    // Resolve default branch + tree sha (HEAD is not reliable)
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

    console.log(`Found ${allFiles.length} indexable files (tree truncated: ${Boolean(treeData?.truncated)})`);

    // prioritize notebooks + source before docs
    const files = allFiles.sort((a, b) => {
      const ap = a.path.toLowerCase();
      const bp = b.path.toLowerCase();
      const score = (p: string) => {
        if (p.endsWith(".ipynb")) return 100;
        if (p.includes("/src/") || p.startsWith("src/")) return 90;
        if (p.endsWith(".py") || p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".js") || p.endsWith(".jsx")) return 80;
        if (p.endsWith(".md")) return 20;
        return 50;
      };
      return score(bp) - score(ap);
    });

    // Store totalFiles immediately
    await supabase
      .from("repositories")
      .update({
        metadata: {
          ...(repoRow.metadata as any),
          totalFiles: files.length,
          totalAvailableFiles: allFiles.length,
          progress: 0,
        },
      })
      .eq("id", repoId);

    let totalChunks = 0;
    let processedFiles = 0;
    let failedFilesCount = 0;
    const failedFilesSample: string[] = [];

    const batchSize = 3;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const filePath = file.path;

          try {
            // Update current file (best-effort)
            await supabase
              .from("repositories")
              .update({
                metadata: {
                  ...(repoRow.metadata as any),
                  totalFiles: files.length,
                  filesProcessed: processedFiles,
                  progress: Math.round((processedFiles / Math.max(1, files.length)) * 100),
                  currentFile: filePath,
                  failedFilesCount,
                  failedFilesSample,
                },
              })
              .eq("id", repoId);

            const contentResp = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(filePath)}`,
              { headers: githubHeaders }
            );

            if (!contentResp.ok) {
              const t = await contentResp.text();
              console.log(`Skipping ${filePath}: ${contentResp.status} ${t}`);
              throw new Error(`contents fetch failed: ${contentResp.status}`);
            }

            const contentJson = await contentResp.json();

            if (Array.isArray(contentJson) || contentJson?.type !== "file") {
              return [];
            }

            const size = Number(contentJson?.size || 0);
            if (size > MAX_FILE_BYTES) {
              console.log(`Skipping large file (>1MB): ${filePath} (${size} bytes)`);
              return [];
            }

            let text = "";
            if (contentJson?.content && contentJson?.encoding === "base64") {
              text = base64ToString(String(contentJson.content));
            } else if (contentJson?.download_url) {
              // fallback to download_url
              const rawResp = await fetch(String(contentJson.download_url), { headers: githubHeaders });
              if (!rawResp.ok) throw new Error(`download_url fetch failed: ${rawResp.status}`);
              text = await rawResp.text();
            } else {
              return [];
            }

            // Skip binary-looking
            if (text.includes("\x00")) {
              console.log(`Skipping binary-looking content: ${filePath}`);
              return [];
            }

            if (filePath.toLowerCase().endsWith(".ipynb")) {
              const nbChunks = parseNotebookToChunks(filePath, text);
              const inserts: ChunkInsert[] = nbChunks.map((c) => ({
                repo_id: repoId,
                file_path: filePath,
                content: c.text,
                chunk_index: c.order,
                metadata: c.meta,
              }));
              return inserts;
            }

            const parts = chunkTextByLines({ filePath, content: text, maxChars: MAX_CHUNK_CHARS });
            const inserts: ChunkInsert[] = parts.map((p) => ({
              repo_id: repoId,
              file_path: filePath,
              content: p.text,
              chunk_index: p.chunkIndex,
              metadata: {
                ...p.meta,
                startLine: p.startLine,
                endLine: p.endLine,
              },
            }));

            return inserts;
          } catch (e) {
            failedFilesCount++;
            if (failedFilesSample.length < 20) failedFilesSample.push(filePath);
            console.error(`Error processing ${filePath}:`, e);
            return [];
          }
        })
      );

      const inserts = batchResults.flat();
      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from("code_chunks").insert(inserts);
        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          totalChunks += inserts.length;
        }
      }

      processedFiles += batch.length;

      await supabase
        .from("repositories")
        .update({
          chunks_count: totalChunks,
          metadata: {
            ...(repoRow.metadata as any),
            progress: Math.round((processedFiles / Math.max(1, files.length)) * 100),
            filesProcessed: processedFiles,
            totalFiles: files.length,
            currentFile: null,
            failedFilesCount,
            failedFilesSample,
          },
        })
        .eq("id", repoId);

      console.log(`Progress: ${processedFiles}/${files.length} files, ${totalChunks} chunks`);

      // gentle delay to reduce API throttling
      await new Promise((r) => setTimeout(r, 120));
    }

    await supabase
      .from("repositories")
      .update({
        ingestion_status: "completed",
        chunks_count: totalChunks,
        metadata: {
          ...(repoRow.metadata as any),
          progress: 100,
          filesProcessed: processedFiles,
          totalFiles: files.length,
          currentFile: null,
          failedFilesCount,
          failedFilesSample,
          completedAt: new Date().toISOString(),
        },
      })
      .eq("id", repoId);

    console.log(`Indexing complete: ${totalChunks} chunks from ${processedFiles} files (failed: ${failedFilesCount})`);

    return new Response(
      JSON.stringify({
        success: true,
        repoId,
        chunksCount: totalChunks,
        filesProcessed: processedFiles,
        totalFiles: files.length,
        failedFilesCount,
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
