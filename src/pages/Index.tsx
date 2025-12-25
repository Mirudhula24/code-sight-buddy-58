import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

// This helps TypeScript understand your table structure
interface Repository {
  id: string;
  repo_url: string;
  summary: string | null;
  created_at: string;
}

const Index = () => {
  const [history, setHistory] = useState<Repository[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase.from("repositories").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error.message);
      } else if (data) {
        setHistory(data as Repository[]);
        console.log("History loaded successfully");
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        {/* We pass the history to Features so it can display your past work */}
        <Features history={history} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
