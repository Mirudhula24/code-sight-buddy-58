import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Layers,
  Link2,
  Sparkles,
  FileCode,
  Shield,
  Bug,
  FormInput,
  Copy,
  Zap,
  BookOpen,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AnimatedHealthScore from "./AnimatedHealthScore";
import {
  HealthMetrics,
  DesignAnalysisData,
  CriticalIssue,
  Warning,
  Suggestion,
} from "@/types/analysis";

interface DesignAnalysisProps {
  designAnalysis?: DesignAnalysisData;
  healthMetrics?: HealthMetrics;
}

type FilterType = "all" | "critical" | "quick-wins";

const DesignAnalysis = ({ designAnalysis, healthMetrics }: DesignAnalysisProps) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getIssueIcon = (type: CriticalIssue["type"]) => {
    switch (type) {
      case "god-component":
        return FileCode;
      case "security-risk":
        return Shield;
      case "unhandled-errors":
        return Bug;
      case "validation-missing":
        return FormInput;
      default:
        return AlertCircle;
    }
  };

  const getWarningIcon = (type: Warning["type"]) => {
    switch (type) {
      case "duplicate-code":
        return Copy;
      case "high-complexity":
        return Zap;
      case "deep-nesting":
        return Layers;
      case "parameter-overload":
        return FormInput;
      default:
        return AlertTriangle;
    }
  };

  const getSuggestionIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "refactoring":
        return Wrench;
      case "performance":
        return Zap;
      case "best-practice":
        return CheckCircle;
      case "documentation":
        return BookOpen;
      default:
        return Lightbulb;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: "stroke-green-500", text: "text-green-500", bg: "bg-green-500" };
    if (score >= 50) return { ring: "stroke-yellow-500", text: "text-yellow-500", bg: "bg-yellow-500" };
    return { ring: "stroke-red-500", text: "text-red-500", bg: "bg-red-500" };
  };

  const getScoreLabel = (label?: string) => {
    switch (label) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "needs-improvement":
        return "Needs Improvement";
      case "critical":
        return "Critical";
      default:
        return "Unknown";
    }
  };

  const score = healthMetrics?.overallScore ?? 75;
  const scoreColors = getScoreColor(score);
  const criticalIssues = healthMetrics?.criticalIssues ?? [];
  const warnings = healthMetrics?.warnings ?? [];
  const suggestions = healthMetrics?.suggestions ?? [];

  // Filter logic
  const filteredCriticalIssues = filter === "quick-wins" ? [] : criticalIssues;
  const filteredWarnings = filter === "critical" ? [] : filter === "quick-wins" ? [] : warnings;
  const filteredSuggestions =
    filter === "critical"
      ? []
      : filter === "quick-wins"
      ? suggestions.filter((s) => s.priority === "low" || s.priority === "medium")
      : suggestions;

  const handleExportReport = () => {
    const report = {
      healthScore: score,
      scoreLabel: healthMetrics?.scoreLabel,
      summary: {
        criticalIssues: criticalIssues.length,
        warnings: warnings.length,
        suggestions: suggestions.length,
      },
      criticalIssues,
      warnings,
      suggestions,
      designAnalysis,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "code-health-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Remove the manual circle calculations since we're using AnimatedHealthScore

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Health Score */}
      <div className="gradient-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Animated Circular Progress */}
          <AnimatedHealthScore targetScore={score} size="lg" />

          {/* Score Details */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Overall Code Health:{" "}
              <span className={scoreColors.text}>{getScoreLabel(healthMetrics?.scoreLabel)}</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Based on code structure, patterns, and best practices analysis
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 transition-transform hover:scale-105">
                <AlertCircle className="w-3 h-3" />
                {healthMetrics?.criticalCount ?? criticalIssues.length} critical
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 transition-transform hover:scale-105">
                <AlertTriangle className="w-3 h-3" />
                {healthMetrics?.warningCount ?? warnings.length} warnings
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 transition-transform hover:scale-105">
                <Lightbulb className="w-3 h-3" />
                {healthMetrics?.suggestionCount ?? suggestions.length} suggestions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="h-8"
        >
          Show All
        </Button>
        <Button
          variant={filter === "critical" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("critical")}
          className="h-8"
        >
          Critical Only
        </Button>
        <Button
          variant={filter === "quick-wins" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("quick-wins")}
          className="h-8"
        >
          Quick Wins
        </Button>
      </div>

      {/* Critical Issues Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <h4 className="font-medium text-foreground">Critical Issues</h4>
        </div>

        {filteredCriticalIssues.length === 0 ? (
          <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 text-sm text-green-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            No critical issues detected ✓
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCriticalIssues.map((issue) => {
              const Icon = getIssueIcon(issue.type);
              const isExpanded = expandedCards.has(issue.id);
              return (
                <div
                  key={issue.id}
                  className="border border-red-500/30 bg-red-500/5 rounded-lg overflow-hidden transition-all hover:border-red-500/50"
                >
                  <button
                    onClick={() => toggleCard(issue.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
                      <Icon className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-foreground text-sm">{issue.title}</h5>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                          Critical
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </button>
                  {isExpanded && issue.affectedFiles && issue.affectedFiles.length > 0 && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="border-t border-red-500/20 pt-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Affected Files
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {issue.affectedFiles.map((file, i) => (
                            <code
                              key={i}
                              className="px-2 py-1 text-xs bg-background/50 text-muted-foreground rounded"
                            >
                              {file}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warnings Section */}
      {filter !== "critical" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </div>
            <h4 className="font-medium text-foreground">Warnings</h4>
          </div>

          {filteredWarnings.length === 0 ? (
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 text-sm text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              No warnings detected ✓
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWarnings.map((warning) => {
                const Icon = getWarningIcon(warning.type);
                const isExpanded = expandedCards.has(warning.id);
                return (
                  <div
                    key={warning.id}
                    className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg overflow-hidden transition-all hover:border-yellow-500/50"
                  >
                    <button
                      onClick={() => toggleCard(warning.id)}
                      className="w-full p-4 flex items-start gap-3 text-left"
                    >
                      <div className="p-2 rounded-lg bg-yellow-500/10 flex-shrink-0">
                        <Icon className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-foreground text-sm">{warning.title}</h5>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                            Warning
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{warning.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="border-t border-yellow-500/20 pt-3 space-y-3">
                          {warning.whyItMatters && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Why it matters
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">{warning.whyItMatters}</p>
                            </div>
                          )}
                          {warning.suggestedFix && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Suggested Fix
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">{warning.suggestedFix}</p>
                            </div>
                          )}
                          {warning.affectedFiles && warning.affectedFiles.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Affected Files
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {warning.affectedFiles.map((file, i) => (
                                  <code
                                    key={i}
                                    className="px-2 py-1 text-xs bg-background/50 text-muted-foreground rounded"
                                  >
                                    {file}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      {filter !== "critical" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Lightbulb className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="font-medium text-foreground">Suggestions</h4>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="p-4 rounded-lg border border-muted/30 bg-muted/5 text-sm text-muted-foreground flex items-center gap-2">
              No suggestions in this filter
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => {
                const Icon = getSuggestionIcon(suggestion.type);
                const isExpanded = expandedCards.has(suggestion.id);
                const priorityColor =
                  suggestion.priority === "high"
                    ? "bg-orange-500/20 text-orange-400"
                    : suggestion.priority === "medium"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-green-500/20 text-green-400";
                return (
                  <div
                    key={suggestion.id}
                    className="border border-blue-500/30 bg-blue-500/5 rounded-lg overflow-hidden transition-all hover:border-blue-500/50"
                  >
                    <button
                      onClick={() => toggleCard(suggestion.id)}
                      className="w-full p-4 flex items-start gap-3 text-left"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                        <Icon className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-foreground text-sm">{suggestion.title}</h5>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs", priorityColor)}>
                            {suggestion.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{suggestion.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="border-t border-blue-500/20 pt-3 space-y-3">
                          {suggestion.benefit && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Benefit
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">{suggestion.benefit}</p>
                            </div>
                          )}
                          {suggestion.example && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Example
                              </span>
                              <pre className="text-sm text-muted-foreground mt-1 p-2 bg-background/50 rounded overflow-x-auto">
                                {suggestion.example}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Design Analysis Legacy Sections */}
      {designAnalysis && (
        <>
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
                  <span
                    className={cn(
                      "text-xs",
                      designAnalysis.architecturalPattern.confidence === "high"
                        ? "text-green-400"
                        : designAnalysis.architecturalPattern.confidence === "medium"
                        ? "text-yellow-400"
                        : "text-orange-400"
                    )}
                  >
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
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      designAnalysis.coupling.level === "low"
                        ? "text-green-400 bg-green-500/20"
                        : designAnalysis.coupling.level === "medium"
                        ? "text-yellow-400 bg-yellow-500/20"
                        : "text-red-400 bg-red-500/20"
                    )}
                  >
                    {designAnalysis.coupling.level.charAt(0).toUpperCase() +
                      designAnalysis.coupling.level.slice(1)}{" "}
                    Coupling
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{designAnalysis.coupling.description}</p>
                {designAnalysis.coupling.hotspots && designAnalysis.coupling.hotspots.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hotspots
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {designAnalysis.coupling.hotspots.map((hotspot, i) => (
                        <code
                          key={i}
                          className="px-2 py-1 text-xs bg-muted/50 text-muted-foreground rounded"
                        >
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
                          <code
                            key={j}
                            className="px-1.5 py-0.5 text-xs bg-muted/30 text-muted-foreground rounded"
                          >
                            {loc}
                          </code>
                        ))}
                        {pattern.locations.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{pattern.locations.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DesignAnalysis;
