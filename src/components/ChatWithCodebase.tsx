import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileCode,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ file: string; similarity: number }>;
  timestamp: Date;
}

interface ChatWithCodebaseProps {
  repositoryUrl: string;
  repositoryName: string;
}

const ChatWithCodebase = ({ repositoryUrl, repositoryName }: ChatWithCodebaseProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const { data, error: functionError } = await supabase.functions.invoke("chat-with-repo", {
        body: {
          question: userMessage.content,
          repositoryUrl,
          conversationHistory,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Chat request failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer || "I couldn't generate a response.",
        sources: data.sourcesUsed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      setError(errorMessage);
      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
      if (lastUserMessage) {
        // Remove the last user message and retry
        setMessages((prev) => prev.filter((m) => m.id !== lastUserMessage.id));
        setInput(lastUserMessage.content);
        setError(null);
      }
    }
  };

  const suggestedQuestions = [
    "What is the main purpose of this codebase?",
    "Explain the folder structure",
    "What are the key components?",
    "How is authentication handled?",
  ];

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground">Chat with Codebase</h4>
          <p className="text-xs text-muted-foreground">{repositoryName}</p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 py-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-base font-medium text-foreground mb-2">
              Ask about the codebase
            </h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              I can help you understand the repository architecture, explain code patterns, 
              and answer questions about specific files or functions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((question, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInput(question);
                    inputRef.current?.focus();
                  }}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                } animate-fade-in`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`flex-1 max-w-[80%] ${
                    message.role === "user" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-xl text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground border border-border"
                    }`}
                  >
                    <div
                      className={`prose prose-sm max-w-none ${
                        message.role === "user" ? "prose-invert" : "dark:prose-invert"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(message.content),
                      }}
                    />
                  </div>
                  
                  {/* Source Files */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.sources.slice(0, 3).map((source, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted/30 text-muted-foreground rounded-full"
                        >
                          <FileCode className="w-3 h-3" />
                          {source.file.split("/").pop()}
                        </span>
                      ))}
                      {message.sources.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-muted-foreground">
                          +{message.sources.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-3">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive flex-1">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="text-destructive hover:text-destructive"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Ask about the codebase..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-input border-border focus:border-primary"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

// Helper function to format message content with markdown-like syntax
const formatMessage = (content: string): string => {
  // Escape HTML first
  let formatted = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Format code blocks
  formatted = formatted.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre class="bg-muted/50 p-3 rounded-lg overflow-x-auto my-2"><code class="text-xs font-mono">$2</code></pre>'
  );

  // Format inline code
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'
  );

  // Format bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Format line breaks
  formatted = formatted.replace(/\n/g, "<br />");

  return formatted;
};

export default ChatWithCodebase;
