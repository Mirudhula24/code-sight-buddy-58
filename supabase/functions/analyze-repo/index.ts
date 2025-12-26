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

    // GitHub API headers - use token if available for higher rate limits
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const githubHeaders: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeSight-Analyzer'
    };
    if (GITHUB_TOKEN) {
      githubHeaders['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    // Fetch repository metadata from GitHub API
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: githubHeaders
    });

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      console.error('GitHub API error:', repoResponse.status, errorText);
      
      if (repoResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'GitHub API rate limit exceeded. Please try again in a few minutes, or add a GitHub token for higher limits.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (repoResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Repository not found. Please check the URL and ensure the repository is public.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Failed to fetch repository data: ${repoResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const repoData = await repoResponse.json();

    // Fetch repository file tree with sizes
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`,
      { headers: githubHeaders }
    );

    let fileTree: Array<{ path: string; size: number }> = [];
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      fileTree = treeData.tree
        ?.filter((item: any) => item.type === 'blob')
        ?.map((item: any) => ({ path: item.path, size: item.size || 0 }))
        ?.slice(0, 150) || [];
    }

    // Fetch README if available
    let readmeContent = '';
    const readmeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/readme`,
      { headers: { ...githubHeaders, 'Accept': 'application/vnd.github.v3.raw' } }
    );
    if (readmeResponse.ok) {
      readmeContent = await readmeResponse.text();
      readmeContent = readmeContent.substring(0, 4000);
    }

    // Fetch languages
    const langResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/languages`,
      { headers: githubHeaders }
    );
    const languages = langResponse.ok ? await langResponse.json() : {};

    // Identify large files (potential god components)
    const largeFiles = fileTree
      .filter(f => f.size > 10000 && (f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx') || f.path.endsWith('.py') || f.path.endsWith('.java')))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map(f => ({ path: f.path, size: f.size }));

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

File Structure (up to 150 files):
${fileTree.map(f => `${f.path} (${f.size} bytes)`).join('\n')}

Large Files (potential god components):
${largeFiles.map(f => `${f.path}: ${f.size} bytes`).join('\n') || 'None detected'}

README (excerpt):
${readmeContent || 'No README available'}
`;

    console.log('Calling Lovable AI for comprehensive analysis...');

    // Call Lovable AI for comprehensive analysis
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
            content: `You are an expert code architect and analyst. Analyze GitHub repositories and provide comprehensive structured insights including code health metrics.

Respond with a JSON object containing these fields:
- summary: A 2-3 sentence overview of what this repository does
- architecture: Description of the project architecture and patterns used
- mainTechnologies: Array of main technologies/frameworks used
- keyFeatures: Array of 3-5 key features or capabilities
- codeQuality: Brief assessment of code organization and quality
- complexity: "beginner", "intermediate", or "advanced"
- mermaidDiagram: A valid Mermaid.js flowchart diagram. CRITICAL RULES FOR MERMAID SYNTAX:
  1. Start with "graph TD" on its own line
  2. Use simple alphanumeric node IDs (A, B, C, etc.)
  3. Node labels in square brackets must NOT contain parentheses (), quotes, or special characters
  4. Use hyphens or underscores instead of spaces in labels if needed
  5. Keep labels short and simple
  6. Example of VALID syntax:
     graph TD
       A[Data Input] --> B[Preprocessing]
       B --> C[ML Model]
       C --> D[Evaluation]
       D --> E[Results]
  7. Example of INVALID syntax (DO NOT USE):
     A[Data Analysis (EDA)] - parentheses break parsing
     B["Quoted Label"] - quotes break parsing

- healthMetrics: Object containing comprehensive code health analysis:
  - overallScore: Number 0-100 representing code health
  - scoreLabel: "excellent" (80-100), "good" (60-79), "needs-improvement" (40-59), or "critical" (0-39)
  - criticalCount: Number of critical issues
  - warningCount: Number of warnings
  - suggestionCount: Number of suggestions
  
  - criticalIssues: Array of critical issues, each with:
    - id: Unique string identifier
    - type: "god-component" | "security-risk" | "unhandled-errors" | "validation-missing"
    - title: Short title like "God Component Detected"
    - description: Explanation of the issue
    - affectedFiles: Array of file paths affected
    - severity: "critical"
    
  - warnings: Array of warnings, each with:
    - id: Unique string identifier
    - type: "duplicate-code" | "high-complexity" | "deep-nesting" | "parameter-overload"
    - title: Short title like "High Complexity Function"
    - description: What the issue is
    - whyItMatters: Why this is a problem
    - suggestedFix: How to fix it
    - affectedFiles: Array of file paths
    - severity: "warning"
    
  - suggestions: Array of improvement suggestions, each with:
    - id: Unique string identifier
    - type: "refactoring" | "performance" | "best-practice" | "documentation"
    - title: Short title like "Consider Extracting Functions"
    - description: What improvement to make
    - benefit: Why this helps
    - example: Optional example of the improvement
    - priority: "high" | "medium" | "low"

- designAnalysis: Object containing:
  - architecturalPattern: Object with "name", "description", and "confidence" (high/medium/low)
  - coupling: Object with "level" (low/medium/high), "description", and optional "hotspots" array
  - codePatterns: Array of objects with "pattern", "description", and optional "locations" array

IMPORTANT: 
- Analyze the file structure and sizes to identify real issues
- Base your analysis on actual code patterns visible in the file list
- Generate realistic, helpful findings based on the repository
- Return ONLY valid JSON, no markdown formatting.`
          },
          {
            role: 'user',
            content: `Analyze this GitHub repository comprehensively. Pay attention to file sizes, naming patterns, and structure to identify code health issues:\n\n${repoContext}`
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
    
    console.log('AI response received:', analysisText.substring(0, 300));

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
        complexity: 'unknown',
        mermaidDiagram: `graph TD
    A[${repoName}] --> B[Source Code]
    B --> C[Dependencies]
    B --> D[Configuration]`,
        designAnalysis: {
          largeFiles: largeFiles.map(f => ({ path: f.path, reason: `Large file: ${Math.round(f.size / 1024)}KB` })),
          codePatterns: [],
          architecturalPattern: { name: 'Unknown', description: 'Unable to determine pattern', confidence: 'low' },
          coupling: { level: 'unknown', description: 'Unable to analyze coupling' }
        }
      };
    }

    // Ensure mermaidDiagram exists and is valid
    if (!analysis.mermaidDiagram || typeof analysis.mermaidDiagram !== 'string') {
      analysis.mermaidDiagram = `graph TD
    A[${repoName}] --> B[Core Modules]
    B --> C[Utils/Helpers]
    B --> D[External APIs]
    C --> E[Output]
    D --> E`;
    }

    // Ensure designAnalysis exists
    if (!analysis.designAnalysis) {
      analysis.designAnalysis = {
        largeFiles: largeFiles.map(f => ({ path: f.path, reason: `Large file: ${Math.round(f.size / 1024)}KB` })),
        codePatterns: [],
        architecturalPattern: { name: 'Not detected', description: 'Unable to determine architectural pattern', confidence: 'low' },
        coupling: { level: 'unknown', description: 'Unable to analyze component coupling' }
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

    console.log('Analysis complete with architecture diagram');

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
