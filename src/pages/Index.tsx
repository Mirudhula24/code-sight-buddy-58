import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    // ✅ FIX: Use 'as any' to allow selecting from 'repositories' even if types aren't synced
    const { data, error } = await (supabase.from("repositories") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error.message);
    } else if (data) {
      setHistory(data);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        {/* Pass the history data to the Features component to display it */}
        <Features history={history} />
      </main>
      <Footer />
    </div>
  );
};

// ✅ FIX: This default export solves the "Module has no default export" error in App.tsx
export default Index;
