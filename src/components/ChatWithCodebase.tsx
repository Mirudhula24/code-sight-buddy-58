import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, RefreshCw, FileCode, Loader2, Code, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Message {
  role: "user" | "assistant";
  content: string;
  filesReferenced?: string[];
  chunksUsed?: number;
  totalFiles?: number;
}

interface IndexingStatus {
  status: "pending" | "indexing" | "completed" | "failed";
  progress?: number;
  filesProcessed?: number;
  totalFiles?: number;
  chunksCount?: number;
  currentFile?: string;
  failedFilesCount?: number;
}

interface IndexedFile {
  file_path: string;
  chunk_count: number;
  language?: string;
}

interface ChatWithCodebaseProps {
  repositoryUrl: string;
  repositoryName: string;
}

const SUGGESTED_QUESTIONS = [
  "How does the main algorithm work?",
  "Explain the code structure",
  "What are the key functions?",
  "Show me the implementation details",
  "What dependencies are used?",
  "How is the data processed?",
];

const ChatWithCodebase = ({ 
  repositoryUrl,
  repositoryName,
}: ChatWithCodebaseProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [showIndexedFiles, setShowIndexedFiles] = useState(false);
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkIndexingStatus();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [repositoryUrl]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkIndexingStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const { data: repo } = await supabase
        .from("repositories")
        .select("*")
        .eq("repo_url", repositoryUrl)
        .single();

      if (repo) {
        const metadata = repo.metadata as { 
          progress?: number; 
          filesProcessed?: number; 
          totalFiles?: number;
          currentFile?: string;
          failedFilesCount?: number;
        } | null;
        
        setIndexingStatus({
          status: repo.ingestion_status as IndexingStatus["status"],
          progress: metadata?.progress,
          filesProcessed: metadata?.filesProcessed,
          totalFiles: metadata?.totalFiles,
          chunksCount: repo.chunks_count || 0,
          currentFile: metadata?.currentFile || undefined,
          failedFilesCount: metadata?.failedFilesCount,
        });

        if (repo.ingestion_status === "indexing") {
          startPolling();
        } else if (repo.ingestion_status === "completed") {
          fetchIndexedFiles(repo.id);
        }
      } else {
        setIndexingStatus({ status: "pending" });
        triggerIndexing();
      }
    } catch (err) {
      console.error("Error checking status:", err);
      setIndexingStatus({ status: "pending" });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const fetchIndexedFiles = async (repoId: string) => {
    try {
      const { data } = await supabase
        .from("code_chunks")
        .select("file_path, metadata")
        .eq("repo_id", repoId);

      if (data) {
        const fileMap = new Map<string, { count: number; language?: string }>();
        data.forEach(chunk => {
          const existing = fileMap.get(chunk.file_path) || { count: 0 };
          existing.count++;
          if (chunk.metadata && typeof chunk.metadata === 'object' && 'language' in chunk.metadata) {
            existing.language = String(chunk.metadata.language);
          }
          fileMap.set(chunk.file_path, existing);
        });

        const files: IndexedFile[] = Array.from(fileMap.entries())
          .map(([path, info]) => ({
            file_path: path,
            chunk_count: info.count,
            language: info.language,
          }))
          .sort((a, b) => b.chunk_count - a.chunk_count);

        setIndexedFiles(files);
      }
    } catch (err) {
      console.error("Error fetching indexed files:", err);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(async () => {
      const { data: repo } = await supabase
        .from("repositories")
        .select("*")
        .eq("repo_url", repositoryUrl)
        .single();

      if (repo) {
        const metadata = repo.metadata as { 
          progress?: number; 
          filesProcessed?: number; 
          totalFiles?: number;
          currentFile?: string;
          failedFilesCount?: number;
        } | null;
        
        setIndexingStatus({
          status: repo.ingestion_status as IndexingStatus["status"],
          progress: metadata?.progress,
          filesProcessed: metadata?.filesProcessed,
          totalFiles: metadata?.totalFiles,
          chunksCount: repo.chunks_count || 0,
          currentFile: metadata?.currentFile || undefined,
          failedFilesCount: metadata?.failedFilesCount,
        });

        if (repo.ingestion_status === "completed" || repo.ingestion_status === "failed") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (repo.ingestion_status === "completed") {
            fetchIndexedFiles(repo.id);
          }
        }
      }
    }, 1500);
  };

  const triggerIndexing = async () => {
    setIndexingStatus({ status: "indexing", progress: 0 });
    startPolling();
    
    try {
      const { data, error } = await supabase.functions.invoke("index-repo", {
        body: { repositoryUrl, forceReindex: true },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setIndexingStatus({
          status: "completed",
          chunksCount: data.chunksCount,
          filesProcessed: data.filesProcessed,
          totalFiles: data.totalFiles,
        });
        toast({
          title: "Indexing Complete",
          description: `Indexed ${data.chunksCount} chunks from ${data.filesProcessed} files.`,
        });
        // Fetch the repo ID and then indexed files
        const { data: repo } = await supabase
          .from("repositories")
          .select("id")
          .eq("repo_url", repositoryUrl)
          .single();
        if (repo) {
          fetchIndexedFiles(repo.id);
        }
      }
    } catch (err) {
      console.error("Indexing error:", err);
      setIndexingStatus({ status: "failed" });
      toast({
        title: "Indexing Failed",
        description: "Could not index repository. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-with-repo", {
        body: {
          message: text,
          repositoryUrl,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.needsIndexing) {
          triggerIndexing();
          throw new Error("Repository needs indexing. Starting now...");
        }
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        filesReferenced: data.filesReferenced,
        chunksUsed: data.chunksUsed,
        totalFiles: data.totalFiles,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking indexing status...</p>
      </div>
    );
  }

  if (indexingStatus?.status === "indexing" || indexingStatus?.status === "pending") {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Code className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <h4 className="text-xl font-semibold text-foreground mb-3">
          Indexing Repository
        </h4>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Analyzing all source files from <span className="font-medium text-foreground">{repositoryName}</span>
        </p>
        
        <div className="w-full max-w-xs mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${indexingStatus.progress || 5}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {indexingStatus.filesProcessed !== undefined && indexingStatus.totalFiles !== undefined
              ? `${indexingStatus.filesProcessed} / ${indexingStatus.totalFiles} files processed`
              : "Starting indexing..."}
          </p>
          
          {indexingStatus.currentFile && (
            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
              Processing: {indexingStatus.currentFile}
            </p>
          )}
          
          {indexingStatus.chunksCount !== undefined && indexingStatus.chunksCount > 0 && (
            <p className="text-xs text-primary font-medium">
              {indexingStatus.chunksCount} code chunks created
            </p>
          )}
        </div>
      </div>
    );
  }

  if (indexingStatus?.status === "failed") {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <FileCode className="w-10 h-10 text-destructive" />
        </div>
        <h4 className="text-xl font-semibold text-foreground mb-3">
          Indexing Failed
        </h4>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          We couldn't index the repository. This might be due to rate limits or access issues.
        </p>
        <Button onClick={triggerIndexing} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry Indexing
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Chat with Codebase</span>
            <Badge variant="secondary" className="text-xs">
              {indexedFiles.length} files · {indexingStatus?.chunksCount || 0} chunks
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={triggerIndexing}
            className="gap-2 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Re-index
          </Button>
        </div>
        
        {/* Indexed Files Collapsible */}
        {indexedFiles.length > 0 && (
          <Collapsible open={showIndexedFiles} onOpenChange={setShowIndexedFiles}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-xs w-full justify-start px-0 h-auto py-1">
                <FolderOpen className="w-3 h-3" />
                <span>View indexed files</span>
                {showIndexedFiles ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-2 bg-muted/50 rounded-md max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {indexedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono truncate flex-1 text-muted-foreground">{file.file_path}</span>
                      <div className="flex items-center gap-2 ml-2">
                        {file.language && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {file.language}
                          </Badge>
                        )}
                        <span className="text-muted-foreground">{file.chunk_count} chunks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Code className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Ask questions about <span className="font-medium text-foreground">{repositoryName}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              AI will search through {indexingStatus?.chunksCount || 0} code chunks from {indexedFiles.length} files
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_QUESTIONS.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(question)}
                  className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  
                  {message.filesReferenced && message.filesReferenced.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <FileCode className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Based on {message.chunksUsed || message.filesReferenced.length} chunks from {message.filesReferenced.length} files
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {message.filesReferenced.slice(0, 6).map((file, j) => (
                          <Badge key={j} variant="outline" className="text-xs font-mono">
                            {file.split('/').pop()}
                          </Badge>
                        ))}
                        {message.filesReferenced.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{message.filesReferenced.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Searching codebase...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="pt-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the code..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={() => handleSendMessage()} 
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWithCodebase;
