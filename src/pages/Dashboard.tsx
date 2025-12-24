import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Sparkles, Search, Library, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
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

    setIsAnalyzing(true);
    // TODO: Implement actual analysis
    toast({
      title: "Analysis Started",
      description: "Analyzing your repository...",
    });

    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: "Your repository has been analyzed!",
      });
    }, 3000);
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
            Start analyzing your repositories to generate architecture overviews, 
            dependency maps, and intelligent documentation.
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
          <div className="gradient-card border border-border rounded-2xl p-12 text-center">
            <div className="text-muted-foreground">
              <Library className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No analyses yet</p>
              <p className="text-sm">Start by analyzing a repository above</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
