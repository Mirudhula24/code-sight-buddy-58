import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import DemoWindow from "./DemoWindow";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">AI-Powered Code Intelligence</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-center mb-6 animate-slide-up">
          <span className="block text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-2">
            Understand Any
          </span>
          <span className="block text-5xl md:text-6xl lg:text-7xl font-bold gradient-text">
            Codebase Instantly
          </span>
        </h1>

        {/* Subtitle */}
        <p 
          className="text-center text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          CodeSight analyzes your repositories to generate architecture overviews, 
          dependency maps, and intelligent documentation — all powered by AI.
        </p>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <Button variant="hero" size="xl">
            Start Analyzing
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <Button variant="outline" size="lg">
            View Documentation
          </Button>
        </div>

        {/* Demo Window */}
        <div 
          className="animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <DemoWindow className="max-w-4xl mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
