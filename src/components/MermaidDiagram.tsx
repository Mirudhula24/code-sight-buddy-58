import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#818cf8",
    primaryTextColor: "#fff",
    primaryBorderColor: "#6366f1",
    lineColor: "#94a3b8",
    secondaryColor: "#1e293b",
    tertiaryColor: "#0f172a",
    background: "#0f172a",
    mainBkg: "#1e293b",
    nodeBkg: "#1e293b",
    nodeBorder: "#6366f1",
    clusterBkg: "#1e293b",
    clusterBorder: "#6366f1",
    titleColor: "#f8fafc",
    edgeLabelBackground: "#1e293b",
    textColor: "#f8fafc",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    padding: 20,
  },
});

const MermaidDiagram = ({ chart, className = "" }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        setError(null);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram");
      }
    };

    renderChart();
  }, [chart]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture-diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 bg-destructive/10 rounded-lg border border-destructive/30 ${className}`}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className={`flex items-center justify-center p-8 bg-muted/30 rounded-lg border border-border ${className}`}>
        <p className="text-muted-foreground text-sm">No architecture diagram available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border">
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-2 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Diagram Container */}
      <div className="overflow-auto rounded-lg border border-border bg-slate-900/50 p-4 min-h-[300px]">
        <div
          ref={containerRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="transition-transform duration-200"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
};

export default MermaidDiagram;
