import { Code2, Github } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

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

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {isHomePage ? (
            <>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
            </>
          ) : (
            <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
          )}
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <Github className="w-5 h-5" />
          </Button>
          <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
