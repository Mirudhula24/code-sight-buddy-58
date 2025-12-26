import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-32 pb-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Understand any codebase <span className="text-primary">instantly</span>
        </h1>
        <p className="text-muted-foreground text-xl mb-8 max-w-2xl mx-auto">
          AI-powered code analysis to help you understand, navigate, and improve any repository.
        </p>
        <Button size="lg" onClick={() => navigate("/auth")} className="px-8">
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default Hero;
