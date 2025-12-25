import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!url) return toast.error("Please enter a GitHub URL");
    
    setIsLoading(true);
    try {
      // TODO: Implement analysis functionality
      toast.info("Analysis feature coming soon!");
      setUrl("");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="pt-32 pb-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Understand any codebase <span className="text-primary">instantly</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Paste a GitHub repository link and let our AI document the architecture, patterns, and logic for you.
        </p>

        <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
          <Input
            placeholder="https://github.com/username/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 glass-card"
            disabled={isLoading}
          />
          <Button type="submit" size="lg" disabled={isLoading} className="px-8">
            {isLoading ? "Analyzing..." : "Analyze Repo"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Hero;
