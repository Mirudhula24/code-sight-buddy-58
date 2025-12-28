import { Code2, Github, Menu, X } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isHomePage = location.pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToFeatures = () => {
    if (isHomePage) {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#features");
    }
    setMobileOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Code<span className="text-primary">Sight</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={scrollToFeatures}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </button>
          <Link
            to="/pricing"
            className={`text-sm transition-colors ${
              location.pathname === "/pricing"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pricing
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Github className="w-5 h-5" />
            </a>
          </Button>
          {user ? (
            <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button variant="default" size="sm" onClick={() => navigate("/signup")}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-background border-border">
            <nav className="flex flex-col gap-4 mt-8">
              <button
                onClick={scrollToFeatures}
                className="text-left py-2 text-foreground hover:text-primary transition-colors"
              >
                Features
              </button>
              <Link
                to="/pricing"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </Link>
              <div className="border-t border-border my-4" />
              {user ? (
                <Button variant="default" onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => { navigate("/login"); setMobileOpen(false); }}>
                    Login
                  </Button>
                  <Button variant="default" onClick={() => { navigate("/signup"); setMobileOpen(false); }}>
                    Get Started
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
