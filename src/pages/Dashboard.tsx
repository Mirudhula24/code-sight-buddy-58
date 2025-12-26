import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Sparkles, Search, Library, PlusCircle, ExternalLink, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AnalysisData {
  summary?: string;
  architecture?: string;
  mainTechnologies?: string[];
  keyFeatures?: string[];
  codeQuality?: string;
  suggestions?: string[];
  complexity?: string;
  metadata?: {
    owner?: string;
    repoName?: string;
    stars?: number;
    forks?: number;
    language?: string;
    languages?: string[];
    fileCount?: number;
    analyzedAt?: string;
  };
}

interface Analysis {
  id: string;
  repository_url: string;
  repository_name: string;
  analysis_data: AnalysisData | null;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAnalyses = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching analyses:", error.message);
    } else {
      setAnalyses((data || []) as Analysis[]);
    }
    setIsLoading(false);
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
    toast({
      title: "Analysis Started",
      description: "AI is analyzing your repository. This may take a moment...",
    });

    try {
      const repoName = extractRepoName(repoUrl);
      
      // Call the AI-powered edge function
      const { data: analysisResult, error: functionError } = await supabase.functions.invoke('analyze-repo', {
        body: { repositoryUrl: repoUrl.trim() }
      });

      if (functionError) {
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
        description: "Your repository has been analyzed with AI!",
      });

      setRepoUrl("");
      fetchAnalyses();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Analysis error:", errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
            Start analyzing your repositories to generate AI-powered architecture overviews, 
            technology insights, and improvement suggestions.
          </p>
        </div>

        {/* Analysis Input */}
        <div className="max-w-2xl mx-auto mb-12">
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
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAnalysis()}
                />
              </div>
              <Button
                variant="hero"
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "Start Analyzing"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Library Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            Your Library
          </h2>

          {isLoading ? (
            <div className="gradient-card border border-border rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your analyses...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="gradient-card border border-border rounded-2xl p-12 text-center">
              <div className="text-muted-foreground">
                <Library className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No analyses yet</p>
                <p className="text-sm">Start by analyzing a repository above</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => {
                const data = analysis.analysis_data as AnalysisData | null;
                const isExpanded = expandedId === analysis.id;
                
                return (
                  <div
                    key={analysis.id}
                    className="gradient-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
                  >
                    {/* Card Header */}
                    <div 
                      className="p-5 cursor-pointer"
                      onClick={() => toggleExpand(analysis.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">
                              {analysis.repository_name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              analysis.status === "completed" 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {analysis.status}
                            </span>
                          </div>
                          {data?.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {data.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(analysis.created_at), "MMM d, yyyy")}
                          </span>
                          {data?.metadata?.stars !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              ⭐ {data.metadata.stars}
                            </span>
                          )}
                          {data?.complexity && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              data.complexity === 'beginner' ? 'bg-green-500/20 text-green-400' :
                              data.complexity === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                              data.complexity === 'advanced' ? 'bg-red-500/20 text-red-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {data.complexity}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={analysis.repository_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnalysis(analysis.id);
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && data && (
                      <div className="border-t border-border p-5 bg-background/50 space-y-4">
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
                                <span key={i} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
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
                              {data.metadata.fileCount && (
                                <span>📁 {data.metadata.fileCount} files analyzed</span>
                              )}
                              {data.metadata.forks !== undefined && (
                                <span>🍴 {data.metadata.forks} forks</span>
                              )}
                              {data.metadata.languages && data.metadata.languages.length > 0 && (
                                <span>💻 {data.metadata.languages.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
