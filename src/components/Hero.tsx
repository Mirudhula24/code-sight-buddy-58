import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

const Hero = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return toast.error("Please enter a GitHub URL");

    setIsLoading(true);
    try {
      // 1. CALL THE EDGE FUNCTION (Matches "analyze-repo-")
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke("analyze-repo-", {
        body: { url: url },
      });

      if (aiError) throw new Error("AI Analysis failed: " + aiError.message);

      // 2. SAVE TO DATABASE
      // ✅ DOUBLE CASTING: This stops the error about 'repo_url' and 'never'
      const { error: dbError } = await (supabase.from("repositories") as any).insert([
        {
          repo_url: url,
          summary: aiResponse.summary,
        },
      ] as any);

      if (dbError) throw dbError;

      toast.success("Analysis complete!");
      setUrl("");
      window.location.reload();
    } catch (error: any) {
      console.error("Full error details:", error);
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
        <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
          <Input
            placeholder="https://github.com/username/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="glass-card"
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
