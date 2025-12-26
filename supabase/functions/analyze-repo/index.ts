import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repositoryUrl } = await req.json();
    
    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: 'Repository URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract owner/repo from GitHub URL
    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Invalid GitHub URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');
    
    console.log(`Analyzing repository: ${owner}/${repoName}`);

    // Fetch repository metadata from GitHub API
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!repoResponse.ok) {
      console.error('GitHub API error:', repoResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch repository data from GitHub' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const repoData = await repoResponse.json();

    // Fetch repository file tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );

    let fileTree: string[] = [];
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      fileTree = treeData.tree
        ?.filter((item: any) => item.type === 'blob')
        ?.map((item: any) => item.path)
        ?.slice(0, 100) || []; // Limit to 100 files
    }

    // Fetch README if available
    let readmeContent = '';
    const readmeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/readme`,
      { headers: { 'Accept': 'application/vnd.github.v3.raw' } }
    );
    if (readmeResponse.ok) {
      readmeContent = await readmeResponse.text();
      readmeContent = readmeContent.substring(0, 3000); // Limit README size
    }

    // Fetch languages
    const langResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/languages`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
    const languages = langResponse.ok ? await langResponse.json() : {};

    // Build context for AI analysis
    const repoContext = `
Repository: ${owner}/${repoName}
Description: ${repoData.description || 'No description'}
Primary Language: ${repoData.language || 'Unknown'}
Languages Used: ${Object.keys(languages).join(', ') || 'Unknown'}
Stars: ${repoData.stargazers_count}
Forks: ${repoData.forks_count}
Open Issues: ${repoData.open_issues_count}
Created: ${repoData.created_at}
Last Updated: ${repoData.pushed_at}

File Structure (up to 100 files):
${fileTree.join('\n')}

README (excerpt):
${readmeContent || 'No README available'}
`;

    console.log('Calling Lovable AI for analysis...');

    // Call Lovable AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert code analyst. Analyze GitHub repositories and provide structured insights.
            
Respond with a JSON object containing these fields:
- summary: A 2-3 sentence overview of what this repository does
- architecture: Description of the project architecture and patterns used
- mainTechnologies: Array of main technologies/frameworks used
- keyFeatures: Array of 3-5 key features or capabilities
- codeQuality: Brief assessment of code organization and quality
- suggestions: Array of 2-3 improvement suggestions
- complexity: "beginner", "intermediate", or "advanced"

Return ONLY valid JSON, no markdown formatting.`
          },
          {
            role: 'user',
            content: `Analyze this GitHub repository:\n\n${repoContext}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received:', analysisText.substring(0, 200));

    // Parse the AI response
    let analysis;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = analysisText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      analysis = JSON.parse(cleanedText.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        summary: analysisText.substring(0, 500),
        architecture: 'Unable to parse detailed analysis',
        mainTechnologies: Object.keys(languages).slice(0, 5),
        keyFeatures: [],
        codeQuality: 'Analysis pending',
        suggestions: [],
        complexity: 'unknown'
      };
    }

    // Add metadata
    const result = {
      ...analysis,
      metadata: {
        owner,
        repoName,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        language: repoData.language,
        languages: Object.keys(languages),
        fileCount: fileTree.length,
        analyzedAt: new Date().toISOString()
      }
    };

    console.log('Analysis complete');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-repo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
