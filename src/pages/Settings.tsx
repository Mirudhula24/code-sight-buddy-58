import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  User,
  Github,
  Sliders,
  Bot,
  Save,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Account settings
  const [displayName, setDisplayName] = useState("");

  // Analysis preferences
  const [analysisDepth, setAnalysisDepth] = useState("balanced");
  const [ignoreFolders, setIgnoreFolders] = useState("node_modules, .git, dist, build");

  // AI behavior
  const [explanationStyle, setExplanationStyle] = useState("engineer");
  const [verbosity, setVerbosity] = useState("medium");
  const [showConfidence, setShowConfidence] = useState(true);

  const handleSave = () => {
    // In a real app, this would save to database
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Customize your CodeSight experience
        </p>
      </div>

      {/* Account Section */}
      <div className="gradient-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Account</h2>
            <p className="text-sm text-muted-foreground">Manage your profile information</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-input"
            />
          </div>
        </div>
      </div>

      {/* GitHub Connection */}
      <div className="gradient-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Github className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">GitHub Connection</h2>
            <p className="text-sm text-muted-foreground">Connect your GitHub account for private repos</p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
          <div>
            <p className="font-medium text-foreground">GitHub Account</p>
            <p className="text-sm text-muted-foreground">Not connected</p>
          </div>
          <Button variant="outline" disabled className="gap-2">
            <Github className="w-4 h-4" />
            Connect
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          GitHub integration coming soon. Currently only public repositories are supported.
        </p>
      </div>

      {/* Analysis Preferences */}
      <div className="gradient-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Sliders className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Analysis Preferences</h2>
            <p className="text-sm text-muted-foreground">Configure how repositories are analyzed</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="depth">Analysis Depth</Label>
            <Select value={analysisDepth} onValueChange={setAnalysisDepth}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast (Overview only)</SelectItem>
                <SelectItem value="balanced">Balanced (Recommended)</SelectItem>
                <SelectItem value="deep">Deep (Comprehensive)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deeper analysis takes longer but provides more detailed insights
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ignore">Ignore Folders</Label>
            <Input
              id="ignore"
              type="text"
              value={ignoreFolders}
              onChange={(e) => setIgnoreFolders(e.target.value)}
              className="bg-input font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of folders to exclude from analysis
            </p>
          </div>
        </div>
      </div>

      {/* AI Behavior */}
      <div className="gradient-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Behavior</h2>
            <p className="text-sm text-muted-foreground">Customize AI explanations and responses</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="style">Explanation Style</Label>
            <Select value={explanationStyle} onValueChange={setExplanationStyle}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (Simple explanations)</SelectItem>
                <SelectItem value="engineer">Engineer (Technical details)</SelectItem>
                <SelectItem value="architect">Architect (High-level patterns)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verbosity">Verbosity Level</Label>
            <Select value={verbosity} onValueChange={setVerbosity}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise (Key points only)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="detailed">Detailed (Full explanations)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-foreground">Show Confidence Scores</p>
              <p className="text-sm text-muted-foreground">Display AI confidence for patterns and suggestions</p>
            </div>
            <Switch checked={showConfidence} onCheckedChange={setShowConfidence} />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
