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
      // 1. CALL THE LIVE AI FUNCTION
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke("analyze-repo-", {
        body: { url: url },
      });

      if (aiError) throw new Error("AI Analysis failed: " + aiError.message);

      // 2. SAVE TO THE NEW TABLE (Using 'as any' to avoid sync delays)
      const { error: dbError } = await (supabase.from("repositories") as any).insert([
        {
          repo_url: url,
          summary: aiResponse.summary,
        },
      ]);

      if (dbError) throw dbError;

      toast.success("Analysis complete and saved!");
      setUrl("");
      window.location.reload();
    } catch (error: any) {
      console.error(error);
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
        <form onSubmit={handleAnalyze} className="flex gap-4 max-w-2xl mx-auto">
          <Input
            placeholder="https://github.com/username/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Analyze Repo"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Hero;
