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
      // ✅ Use 'as any' to bypass 'never' error
      const { data, error } = await (supabase.from("repositories") as any)
        .select("*")
        .order("created_at", { ascending: false });

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
        {/* If Features still errors, you may need to update its props or remove this line temporarily */}
        <Features />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
