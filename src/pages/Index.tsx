import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

// This interface helps TypeScript understand the data structure
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
      // ✅ FIX: Added 'as any' to bypass the TypeScript 'never' error
      const { data, error } = await (supabase.from("repositories") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error.message);
      } else if (data) {
        setHistory(data as Repository[]);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features history={history} />
      </main>
      <Footer />
    </div>
  );
};

// ✅ FIX: This line solves the "no default export" error in App.tsx
export default Index;
