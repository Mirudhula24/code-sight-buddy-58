import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Search,
  Library,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const navItems: NavItem[] = [
  { title: "Analyze", icon: Search, href: "/dashboard/analyze" },
  { title: "Library", icon: Library, href: "/dashboard/library" },
  { title: "Insights", icon: BarChart3, href: "/dashboard/insights" },
  { title: "Settings", icon: Settings, href: "/dashboard/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2 px-4 h-16 border-b border-sidebar-border",
        collapsed && !isMobile && "justify-center px-2"
      )}>
        <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />
        {(!collapsed || isMobile) && (
          <span className="text-xl font-bold text-foreground">CodeSight</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/dashboard/analyze" && location.pathname === "/dashboard");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent group",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-sidebar-foreground",
                collapsed && !isMobile && "justify-center px-2"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {(!collapsed || isMobile) && (
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "group-hover:text-foreground"
                )}>
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={cn(
        "p-3 border-t border-sidebar-border",
        collapsed && !isMobile && "flex flex-col items-center"
      )}>
        {(!collapsed || isMobile) && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-3">
            {user?.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Background Effects */}
      <div className="fixed inset-0 gradient-hero pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold text-foreground">CodeSight</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar-background border-sidebar-border">
              <NavContent isMobile />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-screen z-40",
        "bg-sidebar-background border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        <NavContent />
        
        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute -right-3 top-20 w-6 h-6 rounded-full",
            "bg-sidebar-background border border-sidebar-border",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
            "transition-colors"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 relative z-10 transition-all duration-300",
        "pt-14 md:pt-0",
        collapsed ? "md:ml-16" : "md:ml-60"
      )}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
