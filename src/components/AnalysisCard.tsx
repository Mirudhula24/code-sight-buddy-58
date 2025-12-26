import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Trash2, ChevronDown, ChevronUp, GitBranch, FileText, Layout } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MermaidDiagram from "./MermaidDiagram";
import DesignAnalysis from "./DesignAnalysis";
import ShareExportDropdown from "./ShareExportDropdown";
import { Analysis } from "@/types/analysis";

interface AnalysisCardProps {
  analysis: Analysis;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate?: () => void;
}

const AnalysisCard = ({ analysis, isExpanded, onToggleExpand, onDelete, onUpdate }: AnalysisCardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [localAnalysis, setLocalAnalysis] = useState(analysis);
  const data = localAnalysis.analysis_data;

  const handleShareUpdate = (shareToken: string) => {
    setLocalAnalysis((prev) => ({
      ...prev,
      share_token: shareToken,
      is_public: true,
    } as typeof prev));
    onUpdate?.();
  };

  return (
    <div className="gradient-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      {/* Card Header */}
      <div className="p-5 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{localAnalysis.repository_name}</h3>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  localAnalysis.status === "completed"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {localAnalysis.status}
              </span>
            </div>
            {data?.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{data.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {format(new Date(localAnalysis.created_at), "MMM d, yyyy")}
            </span>
            {data?.metadata?.stars !== undefined && (
              <span className="text-xs text-muted-foreground">⭐ {data.metadata.stars}</span>
            )}
            {data?.complexity && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  data.complexity === "beginner"
                    ? "bg-green-500/20 text-green-400"
                    : data.complexity === "intermediate"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : data.complexity === "advanced"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {data.complexity}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <ShareExportDropdown analysis={localAnalysis} onShareUpdate={handleShareUpdate} />
            <a
              href={localAnalysis.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors p-2"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content with Tabs */}
      {isExpanded && data && (
        <div className="border-t border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-5 pt-4 bg-background/50">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="architecture" className="flex items-center gap-2 text-sm">
                  <GitBranch className="w-4 h-4" />
                  Architecture
                </TabsTrigger>
                <TabsTrigger value="design" className="flex items-center gap-2 text-sm">
                  <Layout className="w-4 h-4" />
                  Design Analysis
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-5 space-y-4 bg-background/50 mt-0">
              {data.architecture && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Architecture</h4>
                  <p className="text-sm text-muted-foreground">{data.architecture}</p>
                </div>
              )}

              {data.mainTechnologies && data.mainTechnologies.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.mainTechnologies.map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.keyFeatures && data.keyFeatures.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Key Features</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {data.keyFeatures.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.codeQuality && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Code Quality</h4>
                  <p className="text-sm text-muted-foreground">{data.codeQuality}</p>
                </div>
              )}

              {data.suggestions && data.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Suggestions</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {data.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.metadata && (
                <div className="pt-2 border-t border-border">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {data.metadata.fileCount && <span>📁 {data.metadata.fileCount} files analyzed</span>}
                    {data.metadata.forks !== undefined && <span>🍴 {data.metadata.forks} forks</span>}
                    {data.metadata.languages && data.metadata.languages.length > 0 && (
                      <span>💻 {data.metadata.languages.join(", ")}</span>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="architecture" className="p-5 bg-background/50 mt-0 space-y-6">
              {/* Architectural Pattern Summary */}
              {data.designAnalysis?.architecturalPattern && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">Architectural Pattern</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      data.designAnalysis.architecturalPattern.confidence === 'high' 
                        ? 'bg-green-500/20 text-green-400'
                        : data.designAnalysis.architecturalPattern.confidence === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {data.designAnalysis.architecturalPattern.confidence} confidence
                    </span>
                  </div>
                  <p className="text-base font-semibold text-primary mb-1">
                    {data.designAnalysis.architecturalPattern.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.designAnalysis.architecturalPattern.description}
                  </p>
                </div>
              )}

              {/* System Architecture Diagram */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">System Architecture</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Visual representation of main components, data flow, and dependencies
                </p>
                <MermaidDiagram chart={data.mermaidDiagram || ""} className="min-h-[400px]" />
              </div>

              {/* Component Dependencies */}
              {data.designAnalysis?.coupling && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">Component Coupling</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      data.designAnalysis.coupling.level === 'low' 
                        ? 'bg-green-500/20 text-green-400'
                        : data.designAnalysis.coupling.level === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : data.designAnalysis.coupling.level === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {data.designAnalysis.coupling.level} coupling
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {data.designAnalysis.coupling.description}
                  </p>
                  {data.designAnalysis.coupling.hotspots && data.designAnalysis.coupling.hotspots.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground mb-1">Coupling Hotspots:</p>
                      <div className="flex flex-wrap gap-2">
                        {data.designAnalysis.coupling.hotspots.map((hotspot, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded font-mono">
                            {hotspot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="design" className="p-5 bg-background/50 mt-0">
              <DesignAnalysis designAnalysis={data.designAnalysis} healthMetrics={data.healthMetrics} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AnalysisCard;
