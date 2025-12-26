export interface CriticalIssue {
  id: string;
  type: "god-component" | "security-risk" | "unhandled-errors" | "validation-missing";
  title: string;
  description: string;
  affectedFiles?: string[];
  severity: "critical";
}

export interface Warning {
  id: string;
  type: "duplicate-code" | "high-complexity" | "deep-nesting" | "parameter-overload";
  title: string;
  description: string;
  whyItMatters?: string;
  suggestedFix?: string;
  affectedFiles?: string[];
  severity: "warning";
}

export interface Suggestion {
  id: string;
  type: "refactoring" | "performance" | "best-practice" | "documentation";
  title: string;
  description: string;
  benefit?: string;
  example?: string;
  priority: "high" | "medium" | "low";
}

export interface HealthMetrics {
  overallScore?: number;
  scoreLabel?: "excellent" | "good" | "needs-improvement" | "critical";
  criticalCount?: number;
  warningCount?: number;
  suggestionCount?: number;
  criticalIssues?: CriticalIssue[];
  warnings?: Warning[];
  suggestions?: Suggestion[];
}

export interface DesignAnalysisData {
  largeFiles?: Array<{ path: string; reason: string }>;
  codePatterns?: Array<{ pattern: string; description: string; locations?: string[] }>;
  architecturalPattern?: { name: string; description: string; confidence: string };
  coupling?: { level: string; description: string; hotspots?: string[] };
}

export interface AnalysisMetadata {
  owner?: string;
  repoName?: string;
  stars?: number;
  forks?: number;
  language?: string;
  languages?: string[];
  fileCount?: number;
  analyzedAt?: string;
}

export interface AnalysisData {
  summary?: string;
  architecture?: string;
  mainTechnologies?: string[];
  keyFeatures?: string[];
  codeQuality?: string;
  suggestions?: string[];
  complexity?: string;
  mermaidDiagram?: string;
  healthMetrics?: HealthMetrics;
  designAnalysis?: DesignAnalysisData;
  metadata?: AnalysisMetadata;
}

export interface Analysis {
  id: string;
  repository_url: string;
  repository_name: string;
  analysis_data: AnalysisData | null;
  status: string;
  created_at: string;
}
