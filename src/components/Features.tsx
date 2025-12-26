import { Brain, Compass, BookOpen } from "lucide-react";
import FeatureCard from "./FeatureCard";

const Features = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Brain}
            title="AI Analysis"
            description="Get instant insights about code structure, patterns, and potential improvements."
          />
          <FeatureCard
            icon={Compass}
            title="Smart Navigation"
            description="Navigate complex codebases with intelligent file tree and dependency mapping."
          />
          <FeatureCard
            icon={BookOpen}
            title="Code Understanding"
            description="Understand unfamiliar code with AI-generated explanations and documentation."
          />
        </div>
      </div>
    </section>
  );
};

export default Features;
