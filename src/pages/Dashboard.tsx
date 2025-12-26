import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Sparkles, Search, Library, PlusCircle, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnalysisCard from "@/components/AnalysisCard";
import AnalysisCardSkeleton from "@/components/AnalysisCardSkeleton";
import AnalysisProgress from "@/components/AnalysisProgress";
import EmptyState from "@/components/EmptyState";
import { Analysis } from "@/types/analysis";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const fetchAnalyses = async () => {
    if (!user) return;
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      setAnalyses((data || []) as Analysis[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load analyses";
      setError(errorMessage);
      console.error("Error fetching analyses:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
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

    try {
      const repoName = extractRepoName(repoUrl);
      
      // Call the AI-powered edge function
      const { data: analysisResult, error: functionError } = await supabase.functions.invoke('analyze-repo', {
        body: { repositoryUrl: repoUrl.trim() }
      });

      if (functionError) {
        // Check for rate limit
        if (functionError.message?.includes('rate limit') || functionError.message?.includes('429')) {
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
          throw new Error('Rate limit exceeded. Please wait before trying again.');
        }
        throw new Error(functionError.message || 'Analysis failed');
      }

      if (analysisResult?.error) {
        throw new Error(analysisResult.error);
      }

      // Save to database
      const { error: dbError } = await supabase.from("analyses").insert({
        user_id: user.id,
        repository_url: repoUrl.trim(),
        repository_name: repoName,
        analysis_data: analysisResult,
        status: "completed",
      });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Analysis Complete",
        description: "Your repository architecture has been analyzed with AI!",
      });

      setRepoUrl("");
      fetchAnalyses();
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

  const handleRetry = () => {
    setError(null);
    handleStartAnalysis();
  };

  const handleDeleteAnalysis = async (id: string) => {
    const { error } = await supabase.from("analyses").delete().eq("id", id);

    if (error) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Analysis Deleted",
        description: "The analysis has been removed from your library.",
      });
      fetchAnalyses();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-50" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">CodeSight</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Welcome to <span className="gradient-text">CodeSight</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Analyze repositories to generate AI-powered architecture diagrams, 
            design pattern detection, and improvement suggestions.
          </p>
        </div>

        {/* Analysis Input */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="gradient-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              New Analysis
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
                  onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleStartAnalysis()}
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
                    onClick={handleRetry}
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Progress */}
        <div className="max-w-2xl mx-auto">
          <AnalysisProgress isAnalyzing={isAnalyzing} />
        </div>

        {/* Library Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            Your Library
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              <AnalysisCardSkeleton />
              <AnalysisCardSkeleton />
              <AnalysisCardSkeleton />
            </div>
          ) : error && analyses.length === 0 ? (
            <div className="gradient-card border border-destructive/30 rounded-2xl p-8 text-center animate-fade-in">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-70" />
              <p className="text-lg font-medium text-foreground mb-2">Failed to load analyses</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={fetchAnalyses} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          ) : analyses.length === 0 ? (
            <EmptyState onAnalyze={(url) => { setRepoUrl(url); }} />
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis, index) => (
                <div
                  key={analysis.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <AnalysisCard
                    analysis={analysis}
                    isExpanded={expandedId === analysis.id}
                    onToggleExpand={() => toggleExpand(analysis.id)}
                    onDelete={() => handleDeleteAnalysis(analysis.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
