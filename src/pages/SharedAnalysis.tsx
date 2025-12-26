import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import MermaidDiagram from "@/components/MermaidDiagram";
import DesignAnalysis from "@/components/DesignAnalysis";
import { Analysis } from "@/types/analysis";

const SharedAnalysis = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchSharedAnalysis = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("analyses")
          .select("*")
          .eq("share_token", shareToken)
          .eq("is_public", true)
          .single();

        if (fetchError || !data) {
          setError("Analysis not found or is no longer shared");
          setIsLoading(false);
          return;
        }

        setAnalysis(data as Analysis);
      } catch (err) {
        console.error("Error fetching shared analysis:", err);
        setError("Failed to load analysis");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedAnalysis();
  }, [shareToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Analysis Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This analysis may have been removed or the link is invalid."}
          </p>
          <Link to="/">
            <Button variant="hero">Create Your Own Analysis</Button>
          </Link>
        </div>
      </div>
    );
  }

  const data = analysis.analysis_data;

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />

      {/* View Only Banner */}
      <div className="relative z-20 bg-primary/10 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="w-4 h-4" />
              <span>
                <strong className="text-foreground">View Only</strong> — Create your own analysis at
                CodeSight
              </span>
            </div>
            <Link to="/">
              <Button size="sm" variant="hero">
                Create My Own Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">CodeSight</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analysis Header */}
        <div className="gradient-card border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{analysis.repository_name}</h1>
              <a
                href={analysis.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on GitHub
              </a>
            </div>
            {data?.healthMetrics?.overallScore !== undefined && (
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    data.healthMetrics.overallScore >= 80
                      ? "bg-green-500"
                      : data.healthMetrics.overallScore >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                >
                  {data.healthMetrics.overallScore}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-foreground">Health Score</div>
                  <div className="text-muted-foreground capitalize">
                    {data.healthMetrics.scoreLabel?.replace("-", " ")}
                  </div>
                </div>
              </div>
            )}
          </div>
          {data?.summary && (
            <p className="text-muted-foreground mt-4 text-sm">{data.summary}</p>
          )}
        </div>

        {/* Tabs */}
        {data && (
          <div className="gradient-card border border-border rounded-xl overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-5 pt-4 bg-background/50">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="architecture">Architecture</TabsTrigger>
                  <TabsTrigger value="design">Design Analysis</TabsTrigger>
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

                {data.metadata && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {data.metadata.fileCount && <span>📁 {data.metadata.fileCount} files analyzed</span>}
                      {data.metadata.stars !== undefined && <span>⭐ {data.metadata.stars} stars</span>}
                      {data.metadata.forks !== undefined && <span>🍴 {data.metadata.forks} forks</span>}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="architecture" className="p-5 bg-background/50 mt-0 space-y-6">
                {data.designAnalysis?.architecturalPattern && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground">Architectural Pattern</h4>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          data.designAnalysis.architecturalPattern.confidence === "high"
                            ? "bg-green-500/20 text-green-400"
                            : data.designAnalysis.architecturalPattern.confidence === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
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

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">System Architecture</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Visual representation of main components, data flow, and dependencies
                  </p>
                  <MermaidDiagram chart={data.mermaidDiagram || ""} className="min-h-[400px]" />
                </div>
              </TabsContent>

              <TabsContent value="design" className="p-5 bg-background/50 mt-0">
                <DesignAnalysis
                  designAnalysis={data.designAnalysis}
                  healthMetrics={data.healthMetrics}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Want to analyze your own repositories with AI-powered insights?
          </p>
          <Link to="/">
            <Button variant="hero" size="lg">
              Get Started with CodeSight
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SharedAnalysis;
