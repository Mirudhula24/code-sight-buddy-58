import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // ✅ FIX 1: Handle the browser's security "preflight" check
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiKey) {
      throw new Error("Missing OPENAI_API_KEY secret in Supabase dashboard.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a technical architect. Summarize this GitHub repo in 3 sentences." },
          { role: "user", content: `Analyze: ${url}` },
        ],
      }),
    });

    const aiData = await response.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const summary = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
