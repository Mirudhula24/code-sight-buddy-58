import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, RefreshCw, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  filesReferenced?: string[];
}

interface IndexingStatus {
  status: "pending" | "indexing" | "completed" | "failed";
  progress?: number;
  filesProcessed?: number;
  totalFiles?: number;
  chunksCount?: number;
}

interface ChatWithCodebaseProps {
  repositoryUrl: string;
  repositoryName: string;
}

const SUGGESTED_QUESTIONS = [
  "How does authentication work in this codebase?",
  "What is the overall architecture of this project?",
  "Explain the main data flow",
  "What are the key components?",
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Check indexing status on mount
  useEffect(() => {
    checkIndexingStatus();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [repositoryUrl]);

  // Auto-scroll to bottom when new messages arrive
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
        const metadata = repo.metadata as { progress?: number; filesProcessed?: number; totalFiles?: number } | null;
        setIndexingStatus({
          status: repo.ingestion_status as IndexingStatus["status"],
          progress: metadata?.progress,
          filesProcessed: metadata?.filesProcessed,
          totalFiles: metadata?.totalFiles,
          chunksCount: repo.chunks_count || 0,
        });

        // If indexing, start polling
        if (repo.ingestion_status === "indexing") {
          startPolling();
        }
      } else {
        // No repository found, trigger indexing
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
        const metadata = repo.metadata as { progress?: number; filesProcessed?: number; totalFiles?: number } | null;
        setIndexingStatus({
          status: repo.ingestion_status as IndexingStatus["status"],
          progress: metadata?.progress,
          filesProcessed: metadata?.filesProcessed,
          totalFiles: metadata?.totalFiles,
          chunksCount: repo.chunks_count || 0,
        });

        if (repo.ingestion_status === "completed" || repo.ingestion_status === "failed") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    }, 2000);
  };

  const triggerIndexing = async () => {
    setIndexingStatus({ status: "indexing", progress: 0 });
    
    try {
      const { data, error } = await supabase.functions.invoke("index-repo", {
        body: { repositoryUrl },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setIndexingStatus({
          status: "completed",
          chunksCount: data.chunksCount,
          filesProcessed: data.filesProcessed,
        });
        toast({
          title: "Indexing Complete",
          description: `Indexed ${data.chunksCount} code chunks from ${data.filesProcessed} files.`,
        });
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
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Remove the user message if there was an error
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

  // Loading state
  if (isCheckingStatus) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking indexing status...</p>
      </div>
    );
  }

  // Indexing in progress
  if (indexingStatus?.status === "indexing" || indexingStatus?.status === "pending") {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <FileCode className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <h4 className="text-xl font-semibold text-foreground mb-3">
          Indexing Repository
        </h4>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Analyzing code files from <span className="font-medium text-foreground">{repositoryName}</span>
        </p>
        
        {/* Progress bar */}
        <div className="w-full max-w-xs mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${indexingStatus.progress || 5}%` }}
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {indexingStatus.filesProcessed !== undefined && indexingStatus.totalFiles !== undefined
            ? `${indexingStatus.filesProcessed} / ${indexingStatus.totalFiles} files processed`
            : "Starting indexing..."}
        </p>
        
        {indexingStatus.chunksCount !== undefined && indexingStatus.chunksCount > 0 && (
          <p className="text-xs text-primary mt-2">
            {indexingStatus.chunksCount} chunks indexed
          </p>
        )}
      </div>
    );
  }

  // Indexing failed
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

  // Chat interface (indexing completed)
  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">Chat with Codebase</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
            {indexingStatus?.chunksCount || 0} chunks indexed
          </span>
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

      {/* Messages area */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-6">
              Ask questions about <span className="font-medium text-foreground">{repositoryName}</span>
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
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.filesReferenced && message.filesReferenced.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Files referenced:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.filesReferenced.slice(0, 5).map((file, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 bg-background/50 rounded">
                            {file.split('/').pop()}
                          </span>
                        ))}
                        {message.filesReferenced.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{message.filesReferenced.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
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
