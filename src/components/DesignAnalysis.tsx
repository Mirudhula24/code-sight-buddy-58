import { AlertTriangle, FileCode, Layers, Link2, Sparkles } from "lucide-react";

interface DesignAnalysisProps {
  designAnalysis?: {
    largeFiles?: Array<{ path: string; reason: string }>;
    codePatterns?: Array<{ pattern: string; description: string; locations?: string[] }>;
    architecturalPattern?: { name: string; description: string; confidence: string };
    coupling?: { level: string; description: string; hotspots?: string[] };
  };
}

const DesignAnalysis = ({ designAnalysis }: DesignAnalysisProps) => {
  if (!designAnalysis) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg border border-border">
        <p className="text-muted-foreground text-sm">No design analysis available</p>
      </div>
    );
  }

  const getCouplingColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low":
        return "text-green-400 bg-green-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "high":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-orange-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Architectural Pattern */}
      {designAnalysis.architecturalPattern && (
        <div className="gradient-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-medium text-foreground">Architectural Pattern</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                {designAnalysis.architecturalPattern.name}
              </span>
              <span className={`text-xs ${getConfidenceColor(designAnalysis.architecturalPattern.confidence)}`}>
                ({designAnalysis.architecturalPattern.confidence} confidence)
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {designAnalysis.architecturalPattern.description}
            </p>
          </div>
        </div>
      )}

      {/* Component Coupling */}
      {designAnalysis.coupling && (
        <div className="gradient-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-medium text-foreground">Component Coupling</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCouplingColor(designAnalysis.coupling.level)}`}>
                {designAnalysis.coupling.level.charAt(0).toUpperCase() + designAnalysis.coupling.level.slice(1)} Coupling
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {designAnalysis.coupling.description}
            </p>
            {designAnalysis.coupling.hotspots && designAnalysis.coupling.hotspots.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hotspots</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {designAnalysis.coupling.hotspots.map((hotspot, i) => (
                    <code key={i} className="px-2 py-1 text-xs bg-muted/50 text-muted-foreground rounded">
                      {hotspot}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Code Patterns */}
      {designAnalysis.codePatterns && designAnalysis.codePatterns.length > 0 && (
        <div className="gradient-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-medium text-foreground">Code Patterns Detected</h4>
          </div>
          <div className="space-y-4">
            {designAnalysis.codePatterns.map((pattern, i) => (
              <div key={i} className="border-l-2 border-primary/40 pl-4">
                <h5 className="font-medium text-foreground text-sm">{pattern.pattern}</h5>
                <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                {pattern.locations && pattern.locations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pattern.locations.slice(0, 5).map((loc, j) => (
                      <code key={j} className="px-1.5 py-0.5 text-xs bg-muted/30 text-muted-foreground rounded">
                        {loc}
                      </code>
                    ))}
                    {pattern.locations.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{pattern.locations.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Large Files (Potential God Components) */}
      {designAnalysis.largeFiles && designAnalysis.largeFiles.length > 0 && (
        <div className="gradient-card border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </div>
            <h4 className="font-medium text-foreground">Potential God Components</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These files may be doing too much and could benefit from refactoring:
          </p>
          <div className="space-y-3">
            {designAnalysis.largeFiles.map((file, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <FileCode className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <code className="text-sm text-foreground font-medium">{file.path}</code>
                  <p className="text-xs text-muted-foreground mt-1">{file.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignAnalysis;
