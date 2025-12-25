import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Clock, FileText } from "lucide-react";

// 1. Define the same Interface so TypeScript is happy
interface Repository {
  id: string;
  repo_url: string;
  summary: string | null;
  created_at: string;
}

interface FeaturesProps {
  history?: Repository[]; // The '?' means it's optional
}

const Features = ({ history = [] }: FeaturesProps) => {
  return (
    <section className="py-20 container">
      <h2 className="text-3xl font-bold text-center mb-12">
        {history.length > 0 ? "Your Analysis History" : "Key Features"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {history.length > 0 ? (
          // 2. Loop through history and create a Card for each repo
          history.map((repo) => (
            <Card key={repo.id} className="glass-card hover-scale">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Github className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground truncate">
                    {new Date(repo.created_at).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-sm break-all">{repo.repo_url.replace("https://github.com/", "")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {repo.summary || "Analysis in progress..."}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          // 3. Default "Empty State" or Features if no history exists
          <>
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
          </>
        )}
      </div>
    </section>
  );
};

// Simple helper component for the default view
const FeatureCard = ({ icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <Card className="glass-card text-center p-6">
    <div className="flex justify-center mb-4 text-primary">{icon}</div>
    <CardTitle className="mb-2">{title}</CardTitle>
    <p className="text-muted-foreground">{desc}</p>
  </Card>
);

export default Features;
