import { MessageSquare, Sparkles, Clock } from "lucide-react";

interface ChatWithCodebaseProps {
  repositoryUrl: string;
  repositoryName: string;
}

const ChatWithCodebase = ({ 
  repositoryName,
}: ChatWithCodebaseProps) => {
  return (
    <div className="flex flex-col h-[500px] items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-primary" />
      </div>
      <h4 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Chat with Codebase
      </h4>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Ask questions about <span className="font-medium text-foreground">{repositoryName}</span>'s 
        code structure, architecture, and implementation details.
      </p>
      
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>Coming Soon</span>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 max-w-sm">
        We're working on advanced code indexing to enable intelligent conversations 
        about your codebase. Check back soon!
      </p>
    </div>
  );
};

export default ChatWithCodebase;
