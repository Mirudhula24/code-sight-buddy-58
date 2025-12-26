import { useState, useEffect } from "react";
import { Sparkles, GitBranch, Code, BarChart3, FileSearch } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  isAnalyzing: boolean;
}

const stages = [
  { icon: GitBranch, label: "Fetching repository data...", duration: 8000 },
  { icon: FileSearch, label: "Analyzing file structure...", duration: 12000 },
  { icon: Code, label: "Detecting design patterns...", duration: 15000 },
  { icon: BarChart3, label: "Generating health metrics...", duration: 20000 },
  { icon: Sparkles, label: "Building architecture diagram...", duration: 30000 },
];

const AnalysisProgress = ({ isAnalyzing }: AnalysisProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0);
      setCurrentStage(0);
      setElapsedTime(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we get closer to 100
        const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.3;
        return Math.min(prev + increment, 95);
      });
    }, 500);

    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % stages.length);
    }, 5000);

    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      clearInterval(timeInterval);
    };
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  const CurrentIcon = stages[currentStage].icon;

  return (
    <div className="gradient-card border border-primary/30 rounded-2xl p-6 mb-8 animate-fade-in glow-subtle">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <CurrentIcon className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-lg animate-pulse-glow" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            Analyzing Repository
          </h3>
          <p className="text-sm text-muted-foreground">
            {stages[currentStage].label}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
          <p className="text-xs text-muted-foreground">{elapsedTime}s elapsed</p>
        </div>
      </div>

      <Progress value={progress} className="h-2 mb-4" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>This may take 30-60 seconds for large repositories</span>
        <div className="flex gap-1">
          {stages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStage ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;
