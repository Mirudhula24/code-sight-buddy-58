import { cn } from "@/lib/utils";

interface CodeBlockProps {
  className?: string;
}

const CodeBlock = ({ className }: CodeBlockProps) => {
  return (
    <div className={cn("font-mono text-sm leading-relaxed", className)}>
      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
        <span className="text-code-purple">const</span>
        <span className="text-foreground">analyze</span>
        <span className="text-muted-foreground">=</span>
        <span className="text-code-purple">async</span>
        <span className="text-muted-foreground">(</span>
        <span className="text-code-orange">repo</span>
        <span className="text-muted-foreground">)</span>
        <span className="text-code-purple">=&gt;</span>
        <span className="text-muted-foreground">{"{"}</span>
      </div>
      
      <div className="pl-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-code-purple">const</span>
          <span className="text-foreground">structure</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-code-purple">await</span>
          <span className="text-code-blue">parseFiles</span>
          <span className="text-muted-foreground">(</span>
          <span className="text-code-orange">repo</span>
          <span className="text-muted-foreground">);</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-code-purple">const</span>
          <span className="text-foreground">deps</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-code-blue">mapDependencies</span>
          <span className="text-muted-foreground">(</span>
          <span className="text-foreground">structure</span>
          <span className="text-muted-foreground">);</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-code-purple">const</span>
          <span className="text-foreground">docs</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-code-blue">generateDocs</span>
          <span className="text-muted-foreground">(</span>
          <span className="text-foreground">deps</span>
          <span className="text-muted-foreground">);</span>
        </div>
        
        <div className="mt-3 flex items-center gap-2">
          <span className="text-code-purple">return</span>
          <span className="text-muted-foreground">{"{"}</span>
          <span className="text-foreground">structure</span>
          <span className="text-muted-foreground">,</span>
          <span className="text-foreground">deps</span>
          <span className="text-muted-foreground">,</span>
          <span className="text-foreground">docs</span>
          <span className="text-muted-foreground">{"}"};</span>
        </div>
      </div>
      
      <div className="mt-2 text-muted-foreground">{"}"}</div>
    </div>
  );
};

export default CodeBlock;
