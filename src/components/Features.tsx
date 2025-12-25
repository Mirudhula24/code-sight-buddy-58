import { Card, CardTitle } from "@/components/ui/card";
import { Github, Clock, FileText } from "lucide-react";

const Features = () => {
  return (
    <section className="py-20 container">
      <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          icon={<Github className="w-10 h-10" />}
          title="Repo Analysis"
          desc="Deep dive into any public GitHub repository."
        />
        <FeatureCard
          icon={<FileText className="w-10 h-10" />}
          title="AI Summaries"
          desc="Get instant, readable summaries of complex codebases."
        />
        <FeatureCard
          icon={<Clock className="w-10 h-10" />}
          title="History"
          desc="Keep track of all your past repository analyses."
        />
      </div>
    </section>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <Card className="glass-card text-center p-6">
    <div className="flex justify-center mb-4 text-primary">{icon}</div>
    <CardTitle className="mb-2">{title}</CardTitle>
    <p className="text-muted-foreground">{desc}</p>
  </Card>
);

export default Features;
