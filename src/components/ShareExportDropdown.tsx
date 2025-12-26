import { useState } from "react";
import { Download, Share2, FileText, Link, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF, downloadMarkdown, generateShareToken } from "@/lib/exportUtils";
import { Analysis } from "@/types/analysis";

interface ShareExportDropdownProps {
  analysis: Analysis;
  onShareUpdate?: (shareToken: string) => void;
}

const ShareExportDropdown = ({ analysis, onShareUpdate }: ShareExportDropdownProps) => {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleDownloadPDF = async () => {
    if (!analysis.analysis_data) {
      toast({
        title: "Export Failed",
        description: "No analysis data available to export.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
      await generatePDF({
        repositoryName: analysis.repository_name,
        repositoryUrl: analysis.repository_url,
        analysisData: analysis.analysis_data,
        createdAt: analysis.created_at,
      });
      toast({
        title: "PDF Downloaded",
        description: "Your analysis report has been saved.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!analysis.analysis_data) {
      toast({
        title: "Export Failed",
        description: "No analysis data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      downloadMarkdown({
        repositoryName: analysis.repository_name,
        repositoryUrl: analysis.repository_url,
        analysisData: analysis.analysis_data,
        createdAt: analysis.created_at,
      });
      toast({
        title: "Markdown Downloaded",
        description: "Your analysis report has been saved as Markdown.",
      });
    } catch (error) {
      console.error("Markdown generation error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate Markdown report.",
        variant: "destructive",
      });
    }
  };

  const handleGetShareableLink = async () => {
    setIsGeneratingLink(true);
    try {
      let shareToken = (analysis as Analysis & { share_token?: string }).share_token;

      // If no share token exists, create one
      if (!shareToken) {
        shareToken = generateShareToken();

        const { error } = await supabase
          .from("analyses")
          .update({ is_public: true, share_token: shareToken })
          .eq("id", analysis.id);

        if (error) throw error;
        onShareUpdate?.(shareToken);
      }

      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);

      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);

      toast({
        title: "Link Copied!",
        description: "Shareable link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error("Share link error:", error);
      toast({
        title: "Failed to Generate Link",
        description: "Could not create shareable link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Export / Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
          {isGeneratingPDF ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadMarkdown}>
          <FileText className="w-4 h-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleGetShareableLink} disabled={isGeneratingLink}>
          {isGeneratingLink ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : linkCopied ? (
            <Check className="w-4 h-4 mr-2 text-green-500" />
          ) : (
            <Link className="w-4 h-4 mr-2" />
          )}
          {linkCopied ? "Link Copied!" : "Get Shareable Link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareExportDropdown;
