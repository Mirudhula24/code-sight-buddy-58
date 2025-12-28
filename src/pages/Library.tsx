import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Library as LibraryIcon,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Trash2,
  Calendar,
  ArrowUpDown,
  FolderOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnalysisCardSkeleton from "@/components/AnalysisCardSkeleton";
import EmptyState from "@/components/EmptyState";
import ShareExportDropdown from "@/components/ShareExportDropdown";
import { Analysis } from "@/types/analysis";
import { format } from "date-fns";

const Library = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

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

  const handleOpenAnalysis = (id: string) => {
    navigate(`/dashboard/analyze?id=${id}`);
  };

  const filteredAndSortedAnalyses = useMemo(() => {
    let result = [...analyses];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.repository_name.toLowerCase().includes(query) ||
          a.analysis_data?.mainTechnologies?.some((tech) =>
            tech.toLowerCase().includes(query)
          )
      );
    }

    // Filter by difficulty
    if (difficultyFilter !== "all") {
      result = result.filter((a) => a.analysis_data?.complexity === difficultyFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name-asc":
          return a.repository_name.localeCompare(b.repository_name);
        case "name-desc":
          return b.repository_name.localeCompare(a.repository_name);
        default:
          return 0;
      }
    });

    return result;
  }, [analyses, searchQuery, difficultyFilter, sortBy]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <LibraryIcon className="w-8 h-8 text-primary" />
          Your Library
        </h1>
        <p className="text-muted-foreground">
          Browse and manage your analyzed repositories
        </p>
      </div>

      {/* Filters */}
      <div className="gradient-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by repository name or technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
          <div className="flex gap-3">
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[140px] bg-input border-border">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px] bg-input border-border">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          <AnalysisCardSkeleton />
          <AnalysisCardSkeleton />
          <AnalysisCardSkeleton />
        </div>
      ) : error ? (
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
        <EmptyState onAnalyze={() => navigate("/dashboard/analyze")} />
      ) : filteredAndSortedAnalyses.length === 0 ? (
        <div className="gradient-card border border-border rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Results Found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedAnalyses.map((analysis, index) => (
            <div
              key={analysis.id}
              className="gradient-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {analysis.repository_name}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(analysis.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    analysis.status === "completed"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {analysis.status}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {analysis.analysis_data?.complexity && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      analysis.analysis_data.complexity === "beginner"
                        ? "bg-green-500/20 text-green-400"
                        : analysis.analysis_data.complexity === "intermediate"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : analysis.analysis_data.complexity === "advanced"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {analysis.analysis_data.complexity}
                  </span>
                )}
                {analysis.analysis_data?.mainTechnologies?.slice(0, 2).map((tech, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {tech}
                  </span>
                ))}
                {(analysis.analysis_data?.mainTechnologies?.length || 0) > 2 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    +{analysis.analysis_data!.mainTechnologies!.length - 2}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenAnalysis(analysis.id)}
                    className="flex-1 gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Open
                  </Button>
                  <ShareExportDropdown analysis={analysis} onShareUpdate={fetchAnalyses} />
                </div>
                <div className="flex items-center justify-between">
                  <a
                    href={analysis.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on GitHub
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAnalysis(analysis.id)}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {!isLoading && !error && analyses.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredAndSortedAnalyses.length} of {analyses.length} analyses
        </p>
      )}
    </div>
  );
};

export default Library;
