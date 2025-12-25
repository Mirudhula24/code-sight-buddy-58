import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

// ✅ Fix for App.tsx error: Added "export default"
export default function Index() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase.from("repositories").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error.message);
      } else if (data) {
        setHistory(data);
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
}
