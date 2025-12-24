import { 
  FileSearch, 
  GitBranch, 
  FileText, 
  MessageSquare, 
  Workflow,
  Shield
} from "lucide-react";
import FeatureCard from "./FeatureCard";

const features = [
  {
    icon: FileSearch,
    title: "Repository Parser",
    description: "Automatically scans and indexes your entire codebase, understanding file structures and relationships.",
  },
  {
    icon: GitBranch,
    title: "Dependency Mapping",
    description: "Visualize how modules connect and depend on each other with clear, interactive diagrams.",
  },
  {
    icon: FileText,
    title: "Auto Documentation",
    description: "Generate comprehensive docs for every file, function, and class with AI-powered summaries.",
  },
  {
    icon: MessageSquare,
    title: "Interactive Q&A",
    description: "Ask natural language questions about your code and get accurate, context-aware answers.",
  },
  {
    icon: Workflow,
    title: "Architecture Overview",
    description: "Get high-level summaries of system design, patterns, and architectural decisions.",
  },
  {
    icon: Shield,
    title: "Risk Analysis",
    description: "Identify modules that are risky to modify and understand potential impact of changes.",
  },
];

const Features = () => {
  return (
    <section className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Analysis Tools
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to explore, understand, and document any codebase with confidence.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
