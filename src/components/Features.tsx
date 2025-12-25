interface FeaturesProps {
  history?: any[];
}

const Features = ({ history = [] }: FeaturesProps) => {
  return (
    <section className="py-24 px-4 bg-secondary/50">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">Recent Analyses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {history.length > 0 ? (
            history.map((item, index) => (
              <div key={index} className="glass-card p-6 rounded-xl border bg-card">
                <p className="font-mono text-xs text-primary mb-2 truncate">{item.repo_url}</p>
                <p className="text-sm text-muted-foreground line-clamp-4 italic">
                  {item.summary || "No summary available"}
                </p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-muted-foreground">No analyses found yet. Submit a repo above!</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Features;
