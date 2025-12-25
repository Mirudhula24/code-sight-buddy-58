// Inside handleAnalyze in Hero.tsx
try {
  // ✅ Call the new function name exactly
  const { data: aiResponse, error: aiError } = await supabase.functions.invoke("analyze-repo", {
    body: { url: url },
  });

  if (aiError) throw new Error("AI Analysis failed: " + aiError.message);

  // Save to database
  const { error: dbError } = await supabase.from("repositories").insert([
    {
      repo_url: url,
      summary: aiResponse.summary,
    },
  ]);

  if (dbError) throw dbError;
  toast.success("Analysis complete!");
  window.location.reload();
} catch (error: any) {
  toast.error("Error: " + error.message);
}
