import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Rocket,
  BarChart3,
  MessageSquare,
  Activity,
  AlertTriangle,
  Keyboard,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

const Docs = () => {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections: DocSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Rocket,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Getting Started</h2>
          <p className="text-muted-foreground">
            Welcome to CodeSight! This guide will help you analyze your first repository and understand the powerful features available to you.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">How to analyze your first repository</h3>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>Go to the <span className="text-primary">Analyze</span> tab in your dashboard</li>
              <li>Paste a GitHub repository URL (e.g., <code className="text-primary bg-primary/10 px-2 py-0.5 rounded">https://github.com/facebook/react</code>)</li>
              <li>Click <span className="text-primary">"Start Analyzing"</span></li>
              <li>Wait for the AI to process your repository (usually 30-60 seconds)</li>
              <li>View the results in your Library</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Understanding the dashboard</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Analyze:</strong> Start new repository analyses</li>
              <li><strong className="text-foreground">Library:</strong> View all your past analyses</li>
              <li><strong className="text-foreground">Insights:</strong> Aggregate statistics across all your repositories</li>
              <li><strong className="text-foreground">Settings:</strong> Customize your preferences</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "understanding-results",
      title: "Understanding Results",
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Understanding Results</h2>
          <p className="text-muted-foreground">
            Each analysis provides detailed insights across multiple tabs. Here's what each section means.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Overview Tab</h3>
            <p className="text-muted-foreground">
              The overview provides a summary of your repository including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Health Score:</strong> Overall code quality rating (0-100)</li>
              <li><strong className="text-foreground">File Count:</strong> Total number of files analyzed</li>
              <li><strong className="text-foreground">Language Breakdown:</strong> Distribution of programming languages</li>
              <li><strong className="text-foreground">Key Findings:</strong> Most important discoveries</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Architecture Tab</h3>
            <p className="text-muted-foreground">
              Visualizes your codebase structure and identifies architectural patterns like MVC, microservices, monolith, or layered architecture.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Design Patterns</h3>
            <p className="text-muted-foreground">
              Detects common design patterns in your code:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground text-red-400">Critical:</strong> Issues that should be addressed immediately</li>
              <li><strong className="text-foreground text-yellow-400">Warning:</strong> Potential problems to be aware of</li>
              <li><strong className="text-foreground text-blue-400">Info:</strong> Suggestions for improvement</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "chat-feature",
      title: "Using Chat Feature",
      icon: MessageSquare,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Using the Chat Feature</h2>
          <p className="text-muted-foreground">
            The chat feature uses RAG (Retrieval-Augmented Generation) to answer questions about your codebase based on actual implementation.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">How it works</h3>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>Your repository is indexed and chunked into searchable segments</li>
              <li>When you ask a question, relevant code chunks are retrieved</li>
              <li>The AI uses these chunks as context to generate accurate answers</li>
              <li>Responses include file references so you can verify the source</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Example questions you can ask</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="p-3 bg-muted/30 rounded-lg">"How does the authentication system work?"</li>
              <li className="p-3 bg-muted/30 rounded-lg">"What design patterns are used in this codebase?"</li>
              <li className="p-3 bg-muted/30 rounded-lg">"Explain the main entry point of the application"</li>
              <li className="p-3 bg-muted/30 rounded-lg">"How is state management handled?"</li>
              <li className="p-3 bg-muted/30 rounded-lg">"What are the main dependencies and why are they used?"</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Best practices</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Be specific about which part of the codebase you're asking about</li>
              <li>Ask follow-up questions to dive deeper into specific topics</li>
              <li>Reference file names if you want to focus on particular files</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "health-scores",
      title: "Code Health Scores",
      icon: Activity,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Code Health Scores</h2>
          <p className="text-muted-foreground">
            Health scores provide a quick overview of your codebase quality.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">How scores are calculated</h3>
            <p className="text-muted-foreground">
              The health score considers multiple factors:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Code organization and structure</li>
              <li>Presence of design patterns</li>
              <li>Documentation coverage</li>
              <li>Test coverage (when detectable)</li>
              <li>Complexity metrics</li>
              <li>Dependency management</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Score ranges</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="font-bold text-red-400">0-49: Poor</span>
                <span className="text-muted-foreground">- Significant issues that need attention</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <span className="font-bold text-yellow-400">50-79: Good</span>
                <span className="text-muted-foreground">- Room for improvement but functional</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <span className="font-bold text-green-400">80-100: Excellent</span>
                <span className="text-muted-foreground">- Well-maintained, high-quality code</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: AlertTriangle,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Troubleshooting</h2>
          <p className="text-muted-foreground">
            Common issues and how to resolve them.
          </p>

          <div className="space-y-6">
            <div className="space-y-2 p-4 bg-muted/20 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground">Repository not indexing?</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Ensure the repository is public</li>
                <li>Check if the repository URL is correct</li>
                <li>Verify the repository isn't empty</li>
                <li>If using a private repo, ensure you have connected your GitHub account with proper permissions</li>
              </ul>
            </div>

            <div className="space-y-2 p-4 bg-muted/20 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground">Chat not working?</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Wait for the repository to finish indexing (check the status in your Library)</li>
                <li>Try re-indexing the repository using the "Re-index" button</li>
                <li>Ensure your session hasn't expired - try refreshing the page</li>
              </ul>
            </div>

            <div className="space-y-2 p-4 bg-muted/20 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground">Analysis failed?</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Repository may be too large (&gt;100MB) - try a smaller repository</li>
                <li>Rate limit may have been reached - wait a minute and try again</li>
                <li>The repository may contain unsupported file types</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "shortcuts",
      title: "Keyboard Shortcuts",
      icon: Keyboard,
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Keyboard Shortcuts</h2>
          <p className="text-muted-foreground">
            Speed up your workflow with these keyboard shortcuts.
          </p>

          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Focus search / New analysis</span>
              <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono text-muted-foreground">Ctrl + K</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">New analysis</span>
              <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono text-muted-foreground">Ctrl + N</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Close modals / dialogs</span>
              <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono text-muted-foreground">Esc</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Navigate tabs</span>
              <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono text-muted-foreground">Tab</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Submit form / Send message</span>
              <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono text-muted-foreground">Enter</kbd>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 hidden md:block">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Documentation</h1>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{section.title}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile Section Selector */}
      <div className="md:hidden w-full mb-4">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value)}
          className="w-full p-3 rounded-lg bg-input border border-border text-foreground"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="gradient-card border border-border rounded-xl p-6 md:p-8">
            {sections.find((s) => s.id === activeSection)?.content}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default Docs;
