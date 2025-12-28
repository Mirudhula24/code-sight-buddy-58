import { Brain, Activity, MessageSquare, GitBranch } from "lucide-react";
import FeatureCard from "./FeatureCard";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Get instant insights about code structure, architectural patterns, and potential improvements",
    },
    {
      icon: Activity,
      title: "Code Health Scoring",
      description: "Identify critical issues, warnings, and suggestions with actionable recommendations",
    },
    {
      icon: MessageSquare,
      title: "Interactive Chat",
      description: "Ask questions about your codebase and get answers based on actual implementation using RAG",
    },
    {
      icon: GitBranch,
      title: "Visual Architecture",
      description: "Understand component relationships with auto-generated architecture diagrams",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to understand and improve your codebase
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
