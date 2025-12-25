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
      // 1. CALL THE LIVE AI FUNCTION YOU DEPLOYED
      // This sends the URL to your 'analyze-repo' Edge Function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke("analyze-repo-", {
        body: { url: url },
      });

      if (aiError) throw new Error("AI Analysis failed: " + aiError.message);

      // 2. SAVE THE REAL RESULT TO YOUR DATABASE
      const { error: dbError } = await supabase.from("repositories").insert([
        {
          repo_url: url,
          summary: aiResponse.summary,
        },
      ]);

      if (dbError) throw dbError;

      toast.success("Analysis complete and saved!");
      setUrl("");

      // 3. REFRESH PAGE
      // This tells the app to fetch the new data so it shows up in your list
      window.location.reload();
    } catch (error: any) {
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
