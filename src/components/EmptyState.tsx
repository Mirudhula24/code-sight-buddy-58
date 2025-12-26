import { Library, ArrowRight, GitBranch, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAnalyze: (url: string) => void;
}

const sampleRepos = [
  {
    name: "facebook/react",
    description: "A JavaScript library for building user interfaces",
    stars: "220k+",
  },
  {
    name: "vercel/next.js",
    description: "The React Framework for Production",
    stars: "120k+",
  },
  {
    name: "tailwindlabs/tailwindcss",
    description: "A utility-first CSS framework",
    stars: "80k+",
  },
];

const EmptyState = ({ onAnalyze }: EmptyStateProps) => {
  return (
    <div className="gradient-card border border-border rounded-2xl p-8 md:p-12 animate-fade-in">
      <div className="text-center mb-8">
        {/* Animated Icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse-glow" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
            <Library className="w-10 h-10 text-primary animate-float" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-2">
          No analyses yet
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start by analyzing a GitHub repository above to generate AI-powered architecture diagrams and code health reports.
        </p>
      </div>

      {/* Sample Repositories */}
      <div className="border-t border-border pt-8">
        <p className="text-sm text-muted-foreground text-center mb-4">
          Or try one of these popular repositories:
        </p>
        <div className="grid gap-3 max-w-lg mx-auto">
          {sampleRepos.map((repo) => (
            <button
              key={repo.name}
              onClick={() => onAnalyze(`https://github.com/${repo.name}`)}
              className="group flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {repo.name}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3" />
                    {repo.stars}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {repo.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
