import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Code2, AlertTriangle, TrendingUp, Layers, Zap } from "lucide-react";
import { Analysis } from "@/types/analysis";
import { Skeleton } from "@/components/ui/skeleton";

const Insights = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });

      setAnalyses((data || []) as Analysis[]);
      setIsLoading(false);
    };

    fetchAnalyses();
  }, [user]);

  const insights = useMemo(() => {
    if (analyses.length === 0) return null;

    // Tech stack frequency
    const techCount: Record<string, number> = {};
    analyses.forEach((a) => {
      a.analysis_data?.mainTechnologies?.forEach((tech) => {
        techCount[tech] = (techCount[tech] || 0) + 1;
      });
    });
    const topTechnologies = Object.entries(techCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Architecture patterns
    const patternCount: Record<string, number> = {};
    analyses.forEach((a) => {
      const pattern = a.analysis_data?.designAnalysis?.architecturalPattern?.name;
      if (pattern) {
        patternCount[pattern] = (patternCount[pattern] || 0) + 1;
      }
    });
    const topPatterns = Object.entries(patternCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Common issues
    const issueCount: Record<string, number> = {};
    analyses.forEach((a) => {
      a.analysis_data?.healthMetrics?.criticalIssues?.forEach((issue) => {
        issueCount[issue.type] = (issueCount[issue.type] || 0) + 1;
      });
      a.analysis_data?.healthMetrics?.warnings?.forEach((warning) => {
        issueCount[warning.type] = (issueCount[warning.type] || 0) + 1;
      });
    });
    const topIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Average health score
    const scores = analyses
      .map((a) => a.analysis_data?.healthMetrics?.overallScore)
      .filter((s): s is number => typeof s === "number");
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    // Complexity distribution
    const complexityCount: Record<string, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    analyses.forEach((a) => {
      const complexity = a.analysis_data?.complexity;
      if (complexity && complexity in complexityCount) {
        complexityCount[complexity]++;
      }
    });

    return {
      totalAnalyses: analyses.length,
      topTechnologies,
      topPatterns,
      topIssues,
      avgScore,
      complexityCount,
    };
  }, [analyses]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Insights
          </h1>
          <p className="text-muted-foreground">Analytics across your analyzed repositories</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights || analyses.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Insights
          </h1>
          <p className="text-muted-foreground">Analytics across your analyzed repositories</p>
        </div>
        <div className="gradient-card border border-border rounded-2xl p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Data Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Analyze some repositories to see insights about your tech stack preferences, 
            common patterns, and areas for improvement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Insights
        </h1>
        <p className="text-muted-foreground">
          Analytics across {insights.totalAnalyses} analyzed repositories
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Analyses */}
        <div className="gradient-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-medium text-foreground">Total Analyses</h3>
          </div>
          <p className="text-4xl font-bold text-foreground mb-1">{insights.totalAnalyses}</p>
          <p className="text-sm text-muted-foreground">Repositories analyzed</p>
        </div>

        {/* Average Health Score */}
        <div className="gradient-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-medium text-foreground">Average Health</h3>
          </div>
          <p className="text-4xl font-bold text-foreground mb-1">
            {insights.avgScore !== null ? `${insights.avgScore}%` : "N/A"}
          </p>
          <p className="text-sm text-muted-foreground">Across all repositories</p>
        </div>

        {/* Complexity Distribution */}
        <div className="gradient-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="font-medium text-foreground">Complexity</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(insights.complexityCount).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{level}</span>
                <span className="text-sm font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Technologies */}
        <div className="gradient-card border border-border rounded-xl p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-medium text-foreground">Top Technologies</h3>
          </div>
          <div className="space-y-3">
            {insights.topTechnologies.map(([tech, count], i) => (
              <div key={tech} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{tech}</span>
                    <span className="text-xs text-muted-foreground">{count} repos</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / insights.totalAnalyses) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {insights.topTechnologies.length === 0 && (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </div>
        </div>

        {/* Architectural Patterns */}
        <div className="gradient-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Layers className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-medium text-foreground">Architecture Patterns</h3>
          </div>
          <div className="space-y-2">
            {insights.topPatterns.map(([pattern, count]) => (
              <div key={pattern} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm text-foreground">{pattern}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            ))}
            {insights.topPatterns.length === 0 && (
              <p className="text-sm text-muted-foreground">No patterns detected yet</p>
            )}
          </div>
        </div>

        {/* Common Issues */}
        <div className="gradient-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="font-medium text-foreground">Common Issues</h3>
          </div>
          <div className="space-y-2">
            {insights.topIssues.map(([issue, count]) => (
              <div key={issue} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm text-foreground capitalize">
                  {issue.replace(/-/g, " ")}
                </span>
                <span className="text-xs text-destructive">{count}</span>
              </div>
            ))}
            {insights.topIssues.length === 0 && (
              <p className="text-sm text-muted-foreground">No issues flagged yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
