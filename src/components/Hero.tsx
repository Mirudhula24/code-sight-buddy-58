import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Link as LinkIcon, Bot, MessageSquare, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState("");

  const handleTryFree = () => {
    if (user) {
      // If logged in, go to dashboard with the URL
      navigate("/dashboard/analyze");
    } else {
      // If not logged in, go to signup
      navigate("/signup");
    }
  };

  return (
    <section className="pt-32 pb-20 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm mb-8">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">AI-Powered Code Analysis</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 tracking-tight text-foreground">
          Understand any codebase{" "}
          <span className="text-primary">instantly</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto">
          AI-powered code analysis to help you understand, navigate, and improve any repository.
        </p>

        {/* Input + CTA */}
        <div className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="pl-12 h-12 bg-card border-border focus:border-primary text-base"
              />
            </div>
            <Button
              variant="hero"
              size="lg"
              onClick={handleTryFree}
              className="h-12 px-6 whitespace-nowrap"
            >
              Try Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            No credit card required • 10 free analyses per month
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
