import { useState, useEffect } from "react";

interface AnimatedHealthScoreProps {
  targetScore: number;
  size?: "sm" | "md" | "lg";
}

const AnimatedHealthScore = ({ targetScore, size = "lg" }: AnimatedHealthScoreProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const sizeClasses = {
    sm: { wrapper: "w-16 h-16", text: "text-lg", stroke: 4 },
    md: { wrapper: "w-24 h-24", text: "text-2xl", stroke: 6 },
    lg: { wrapper: "w-32 h-32", text: "text-3xl", stroke: 8 },
  };

  const config = sizeClasses[size];
  const radius = size === "lg" ? 56 : size === "md" ? 40 : 28;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    setIsAnimating(true);
    setDisplayScore(0);

    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = targetScore / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const easeOut = 1 - Math.pow(1 - currentStep / steps, 3);
      setDisplayScore(Math.round(targetScore * easeOut));

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayScore(targetScore);
        setIsAnimating(false);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [targetScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { stroke: "stroke-green-500", text: "text-green-500", bg: "bg-green-500/20" };
    if (score >= 50) return { stroke: "stroke-yellow-500", text: "text-yellow-500", bg: "bg-yellow-500/20" };
    return { stroke: "stroke-red-500", text: "text-red-500", bg: "bg-red-500/20" };
  };

  const colors = getScoreColor(displayScore);
  const progress = (displayScore / 100) * circumference;

  return (
    <div className={`relative ${config.wrapper}`}>
      {/* Background glow */}
      <div className={`absolute inset-0 rounded-full ${colors.bg} blur-xl ${isAnimating ? 'animate-pulse' : ''}`} />
      
      {/* SVG Circle */}
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${(radius + config.stroke) * 2} ${(radius + config.stroke) * 2}`}>
        {/* Background circle */}
        <circle
          cx={radius + config.stroke}
          cy={radius + config.stroke}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={radius + config.stroke}
          cy={radius + config.stroke}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          className={`${colors.stroke} transition-all duration-100`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold ${config.text} ${colors.text}`}>
          {displayScore}
        </span>
      </div>
    </div>
  );
};

export default AnimatedHealthScore;
