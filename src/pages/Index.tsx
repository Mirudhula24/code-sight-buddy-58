import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      // ✅ Using 'as any' bypasses the sync error
      const { data, error } = await (supabase.from("repositories") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error.message);
      } else if (data) {
        setHistory(data);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Features history={history} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
