import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, RotateCcw, Download, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Sanitize mermaid chart to fix common syntax issues
const sanitizeMermaidChart = (chart: string): string => {
  if (!chart) return "";
  
  let sanitized = chart.trim();
  
  // Remove markdown code block markers if present
  sanitized = sanitized.replace(/^```mermaid\s*/i, "");
  sanitized = sanitized.replace(/^```\s*/i, "");
  sanitized = sanitized.replace(/\s*```$/i, "");
  
  // Fix node labels with parentheses - replace (text) with text
  sanitized = sanitized.replace(/\[([^\]]*)\(([^)]*)\)([^\]]*)\]/g, "[$1$2$3]");
  
  // Remove quotes from labels
  sanitized = sanitized.replace(/\["([^"]+)"\]/g, "[$1]");
  sanitized = sanitized.replace(/\['([^']+)'\]/g, "[$1]");
  
  // Ensure graph TD is on its own line
  if (!sanitized.match(/^graph\s+(TD|TB|LR|RL|BT)/im)) {
    sanitized = "graph TD\n" + sanitized;
  }
  
  return sanitized.trim();
};

// Extract a simple text tree from the chart for fallback
const extractTextTree = (chart: string): string[] => {
  if (!chart) return [];
  
  const nodes: string[] = [];
  const nodePattern = /([A-Za-z0-9_]+)\[([^\]]+)\]/g;
  let match;
  
  while ((match = nodePattern.exec(chart)) !== null) {
    nodes.push(match[2]);
  }
  
  return nodes.length > 0 ? nodes : ["Unable to parse architecture"];
};

const MermaidDiagram = ({ chart, className = "" }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [fallbackNodes, setFallbackNodes] = useState<string[]>([]);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        setError(null);
        setFallbackNodes([]);
        
        const sanitizedChart = sanitizeMermaidChart(chart);
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { svg } = await mermaid.render(id, sanitizedChart);
        setSvgContent(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Diagram syntax error");
        setFallbackNodes(extractTextTree(chart));
      }
    };

    renderChart();
  }, [chart]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture-diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!svgContent) return;
    
    // Parse SVG to get actual dimensions from viewBox or width/height attributes
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");
    
    if (!svgElement) return;
    
    // Get dimensions from viewBox, width/height attributes, or getBBox
    let width = 800;
    let height = 600;
    
    const viewBox = svgElement.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }
    
    // Also check width/height attributes
    const svgWidth = svgElement.getAttribute("width");
    const svgHeight = svgElement.getAttribute("height");
    if (svgWidth && svgHeight) {
      width = parseFloat(svgWidth) || width;
      height = parseFloat(svgHeight) || height;
    }
    
    // Add padding
    const padding = 40;
    width += padding * 2;
    height += padding * 2;
    
    // Create a modified SVG with explicit dimensions and background
    const modifiedSvg = svgContent.replace(
      /<svg([^>]*)>/,
      `<svg$1 width="${width}" height="${height}" style="background-color: #0f172a;">`
    );
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    
    // Scale factor for higher resolution
    const scaleFactor = 2;
    
    // Convert SVG to base64 data URL
    const svgBase64 = btoa(unescape(encodeURIComponent(modifiedSvg)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    img.onload = () => {
      canvas.width = width * scaleFactor;
      canvas.height = height * scaleFactor;
      ctx.scale(scaleFactor, scaleFactor);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, padding, padding, width - padding * 2, height - padding * 2);
      
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "architecture-diagram.png";
      a.click();
    };

    img.src = dataUrl;
  };

  if (error) {
    return (
      <div className={`p-6 bg-muted/30 rounded-lg border border-border ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <p className="text-sm text-muted-foreground">Architecture Overview (Text Fallback)</p>
        </div>
        {fallbackNodes.length > 0 ? (
          <div className="space-y-2">
            {fallbackNodes.map((node, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  {index > 0 && <span className="text-xs">↓</span>}
                </div>
                <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-foreground">
                  {node}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to render architecture diagram</p>
        )}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadPNG} className="cursor-pointer">
              <FileImage className="h-4 w-4 mr-2" />
              Download PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadSVG} className="cursor-pointer">
              <Download className="h-4 w-4 mr-2" />
              Download SVG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
