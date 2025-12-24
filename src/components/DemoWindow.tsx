import { cn } from "@/lib/utils";
import FileTree from "./FileTree";
import CodeBlock from "./CodeBlock";

interface DemoWindowProps {
  className?: string;
}

const DemoWindow = ({ className }: DemoWindowProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-border overflow-hidden bg-card shadow-2xl",
        "animate-float",
        className
      )}
    >
      {/* Window Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/70" />
          <div className="w-3 h-3 rounded-full bg-code-yellow/70" />
          <div className="w-3 h-3 rounded-full bg-code-green/70" />
        </div>
        <span className="ml-4 text-sm text-muted-foreground font-mono">CodeSight — project-analyzer</span>
      </div>

      {/* Window Content */}
      <div className="flex h-[320px]">
        {/* Sidebar */}
        <div className="w-52 border-r border-border bg-secondary/20 overflow-auto">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
          </div>
          <FileTree />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono">App.tsx</span>
              <span className="text-xs text-muted-foreground">• Analysis complete</span>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Main application entry point. Handles routing and global state initialization.
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <CodeBlock />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoWindow;
