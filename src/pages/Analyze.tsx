import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  FileText,
  GitBranch,
  Layout,
  Lightbulb,
  MessageSquare,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnalysisProgress from "@/components/AnalysisProgress";
import MermaidDiagram from "@/components/MermaidDiagram";
import DesignAnalysis from "@/components/DesignAnalysis";
import ChatWithCodebase from "@/components/ChatWithCodebase";
import { Analysis } from "@/types/analysis";

const Analyze = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Load analysis from URL param
  useEffect(() => {
    const analysisId = searchParams.get("id");
    if (analysisId) {
      loadAnalysis(analysisId);
    }
  }, [searchParams]);

  const loadAnalysis = async (id: string) => {
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load analysis",
        variant: "destructive",
      });
      return;
    }

    setActiveAnalysis(data as Analysis);
  };

  const extractRepoName = (url: string): string => {
    try {
      const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  const handleStartAnalysis = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: "Repository Required",
        description: "Please enter a repository URL to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to analyze repositories.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setActiveAnalysis(null);

    try {
      const repoName = extractRepoName(repoUrl);

      const { data: analysisResult, error: functionError } = await supabase.functions.invoke("analyze-repo", {
        body: { repositoryUrl: repoUrl.trim() },
      });

      if (functionError) {
        if (functionError.message?.includes("rate limit") || functionError.message?.includes("429")) {
          setRetryCountdown(60);
          const countdownInterval = setInterval(() => {
            setRetryCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          throw new Error("Rate limit exceeded. Please wait before trying again.");
        }
        throw new Error(functionError.message || "Analysis failed");
      }

      if (analysisResult?.error) {
        throw new Error(analysisResult.error);
      }

      // Save to database
      const { data: savedAnalysis, error: dbError } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          repository_url: repoUrl.trim(),
          repository_name: repoName,
          analysis_data: analysisResult,
          status: "completed",
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Analysis Complete",
        description: "Your repository architecture has been analyzed with AI!",
      });

      setActiveAnalysis(savedAnalysis as Analysis);
      setSearchParams({ id: savedAnalysis.id });
      setRepoUrl("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Analysis error:", errorMessage);
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearAnalysis = () => {
    setActiveAnalysis(null);
    setSearchParams({});
  };

  const data = activeAnalysis?.analysis_data;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Analyze Repository
        </h1>
        <p className="text-muted-foreground">
          Enter a GitHub repository URL to generate AI-powered architecture insights
        </p>
      </div>

      {/* Analysis Input */}
      <div className="gradient-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />
          {activeAnalysis ? "New Analysis" : "Start Analysis"}
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="pl-10 bg-input border-border focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && !isAnalyzing && handleStartAnalysis()}
              disabled={isAnalyzing || retryCountdown > 0}
            />
          </div>
          <Button
            variant="hero"
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || retryCountdown > 0}
            className="whitespace-nowrap"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Analyzing...
              </>
            ) : retryCountdown > 0 ? (
              `Wait ${retryCountdown}s`
            ) : (
              "Start Analyzing"
            )}
          </Button>
        </div>

        {/* Error Message with Retry */}
        {error && !isAnalyzing && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Analysis Failed</p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
            {retryCountdown === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartAnalysis}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Analysis Progress */}
      <AnalysisProgress isAnalyzing={isAnalyzing} />

      {/* Active Analysis Results */}
      {activeAnalysis && data && (
        <div className="space-y-6 animate-fade-in">
          {/* Analysis Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                {activeAnalysis.repository_name}
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                  {activeAnalysis.status}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{data.summary}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearAnalysis} className="gap-2">
              <X className="w-4 h-4" />
              Clear
            </Button>
          </div>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50">
              <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="architecture" className="flex items-center gap-2 text-sm">
                <GitBranch className="w-4 h-4" />
                <span className="hidden sm:inline">Architecture</span>
              </TabsTrigger>
              <TabsTrigger value="design" className="flex items-center gap-2 text-sm">
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">Design Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Suggestions</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="gradient-card border border-border rounded-xl p-6 mt-4 space-y-6">
              {data.architecture && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Architecture</h4>
                  <p className="text-sm text-muted-foreground">{data.architecture}</p>
                </div>
              )}

              {data.mainTechnologies && data.mainTechnologies.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.mainTechnologies.map((tech, i) => (
                      <span key={i} className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.keyFeatures && data.keyFeatures.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Key Features</h4>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.keyFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.metadata && (
                <div className="pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {data.metadata.fileCount && <span>📁 {data.metadata.fileCount} files analyzed</span>}
                    {data.metadata.stars !== undefined && <span>⭐ {data.metadata.stars} stars</span>}
                    {data.metadata.forks !== undefined && <span>🍴 {data.metadata.forks} forks</span>}
                    {data.metadata.languages && data.metadata.languages.length > 0 && (
                      <span>💻 {data.metadata.languages.join(", ")}</span>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Architecture Tab */}
            <TabsContent value="architecture" className="gradient-card border border-border rounded-xl p-6 mt-4 space-y-6">
              {data.designAnalysis?.architecturalPattern && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">Architectural Pattern</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      data.designAnalysis.architecturalPattern.confidence === "high"
                        ? "bg-green-500/20 text-green-400"
                        : data.designAnalysis.architecturalPattern.confidence === "medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-muted text-muted-foreground"
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

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">System Architecture</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Visual representation of main components, data flow, and dependencies
                </p>
                <MermaidDiagram chart={data.mermaidDiagram || ""} className="min-h-[400px]" />
              </div>

              {data.designAnalysis?.coupling && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">Component Coupling</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      data.designAnalysis.coupling.level === "low"
                        ? "bg-green-500/20 text-green-400"
                        : data.designAnalysis.coupling.level === "medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : data.designAnalysis.coupling.level === "high"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-muted text-muted-foreground"
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

            {/* Design Patterns Tab */}
            <TabsContent value="design" className="gradient-card border border-border rounded-xl p-6 mt-4">
              <DesignAnalysis designAnalysis={data.designAnalysis} healthMetrics={data.healthMetrics} />
            </TabsContent>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions" className="gradient-card border border-border rounded-xl p-6 mt-4 space-y-4">
              {data.codeQuality && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Code Quality</h4>
                  <p className="text-sm text-muted-foreground">{data.codeQuality}</p>
                </div>
              )}

              {data.suggestions && data.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Improvement Suggestions</h4>
                  <ul className="space-y-3">
                    {data.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                        <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.healthMetrics?.suggestions && data.healthMetrics.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Detailed Recommendations</h4>
                  <ul className="space-y-3">
                    {data.healthMetrics.suggestions.map((suggestion) => (
                      <li key={suggestion.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-foreground">{suggestion.title}</h5>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            suggestion.priority === "high"
                              ? "bg-red-500/20 text-red-400"
                              : suggestion.priority === "medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                          }`}>
                            {suggestion.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                        {suggestion.benefit && (
                          <p className="text-xs text-primary mt-2">✓ {suggestion.benefit}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="gradient-card border border-border rounded-xl p-6 mt-4">
              <ChatWithCodebase 
                repositoryUrl={activeAnalysis.repository_url} 
                repositoryName={activeAnalysis.repository_name}
                ingestionStatus={data.ingestionStatus || 'completed'}
                chunksCount={data.chunksCount || 0}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!activeAnalysis && !isAnalyzing && (
        <div className="gradient-card border border-border rounded-2xl p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Active Analysis</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Enter a GitHub repository URL above to start analyzing its architecture, 
            design patterns, and get improvement suggestions.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepoUrl("https://github.com/facebook/react")}
            >
              Try facebook/react
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepoUrl("https://github.com/vercel/next.js")}
            >
              Try vercel/next.js
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyze;
