import jsPDF from "jspdf";
import { AnalysisData } from "@/types/analysis";

interface ExportOptions {
  repositoryName: string;
  repositoryUrl: string;
  analysisData: AnalysisData;
  createdAt: string;
}

// Generate PDF report
export const generatePDF = async ({
  repositoryName,
  repositoryUrl,
  analysisData,
  createdAt,
}: ExportOptions): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  const addNewPage = () => {
    doc.addPage();
    yPos = 20;
  };

  const checkPageBreak = (height: number) => {
    if (yPos + height > 270) {
      addNewPage();
    }
  };

  // Header with branding
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("CodeSight", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Repository Analysis Report", 14, 28);

  yPos = 50;
  doc.setTextColor(0, 0, 0);

  // Repository Info
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(repositoryName, 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`URL: ${repositoryUrl}`, 14, yPos);
  yPos += 6;
  doc.text(`Analyzed: ${new Date(createdAt).toLocaleDateString()}`, 14, yPos);
  yPos += 15;

  // Health Score Section
  const healthScore = analysisData.healthMetrics?.overallScore ?? 75;
  const scoreLabel = analysisData.healthMetrics?.scoreLabel ?? "good";
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Code Health", 14, yPos);
  yPos += 10;

  // Score circle
  const scoreColor = healthScore >= 80 ? [34, 197, 94] : healthScore >= 50 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.circle(30, yPos + 10, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(String(healthScore), 25, yPos + 12);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Score: ${healthScore}/100 (${scoreLabel.charAt(0).toUpperCase() + scoreLabel.slice(1)})`, 50, yPos + 8);
  
  const criticalCount = analysisData.healthMetrics?.criticalCount ?? 0;
  const warningCount = analysisData.healthMetrics?.warningCount ?? 0;
  const suggestionCount = analysisData.healthMetrics?.suggestionCount ?? 0;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${criticalCount} critical issues • ${warningCount} warnings • ${suggestionCount} suggestions`, 50, yPos + 16);
  yPos += 35;

  // Summary
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(analysisData.summary || "No summary available", pageWidth - 28);
  doc.text(summaryLines, 14, yPos);
  yPos += summaryLines.length * 5 + 10;

  // Architecture
  if (analysisData.designAnalysis?.architecturalPattern) {
    checkPageBreak(25);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Architectural Pattern", 14, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(analysisData.designAnalysis.architecturalPattern.name, 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const archLines = doc.splitTextToSize(analysisData.designAnalysis.architecturalPattern.description, pageWidth - 28);
    doc.text(archLines, 14, yPos);
    yPos += archLines.length * 5 + 10;
  }

  // Technologies
  if (analysisData.mainTechnologies && analysisData.mainTechnologies.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Technologies", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(analysisData.mainTechnologies.join(" • "), 14, yPos);
    yPos += 15;
  }

  // Critical Issues
  const criticalIssues = analysisData.healthMetrics?.criticalIssues ?? [];
  if (criticalIssues.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68);
    doc.text("Critical Issues", 14, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);

    for (const issue of criticalIssues) {
      checkPageBreak(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`• ${issue.title}`, 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const issueLines = doc.splitTextToSize(issue.description, pageWidth - 32);
      doc.text(issueLines, 18, yPos);
      yPos += issueLines.length * 5 + 5;
    }
    yPos += 5;
  }

  // Warnings
  const warnings = analysisData.healthMetrics?.warnings ?? [];
  if (warnings.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(234, 179, 8);
    doc.text("Warnings", 14, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);

    for (const warning of warnings) {
      checkPageBreak(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`• ${warning.title}`, 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const warnLines = doc.splitTextToSize(warning.description, pageWidth - 32);
      doc.text(warnLines, 18, yPos);
      yPos += warnLines.length * 5 + 5;
    }
    yPos += 5;
  }

  // Suggestions
  const suggestions = analysisData.healthMetrics?.suggestions ?? [];
  if (suggestions.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("Suggestions", 14, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);

    for (const suggestion of suggestions) {
      checkPageBreak(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`• ${suggestion.title}`, 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const sugLines = doc.splitTextToSize(suggestion.description, pageWidth - 32);
      doc.text(sugLines, 18, yPos);
      yPos += sugLines.length * 5 + 5;
    }
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by CodeSight • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      290,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `CodeSight-Analysis-${repositoryName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
};

// Generate Markdown report
export const generateMarkdown = ({
  repositoryName,
  repositoryUrl,
  analysisData,
  createdAt,
}: ExportOptions): string => {
  const healthScore = analysisData.healthMetrics?.overallScore ?? 75;
  const scoreLabel = analysisData.healthMetrics?.scoreLabel ?? "good";
  const criticalCount = analysisData.healthMetrics?.criticalCount ?? 0;
  const warningCount = analysisData.healthMetrics?.warningCount ?? 0;
  const suggestionCount = analysisData.healthMetrics?.suggestionCount ?? 0;

  let md = `# CodeSight Analysis Report

## Repository: ${repositoryName}

**URL:** ${repositoryUrl}  
**Analyzed:** ${new Date(createdAt).toLocaleDateString()}

---

## 📊 Overall Code Health

| Metric | Value |
|--------|-------|
| **Score** | ${healthScore}/100 (${scoreLabel.charAt(0).toUpperCase() + scoreLabel.slice(1)}) |
| **Critical Issues** | ${criticalCount} |
| **Warnings** | ${warningCount} |
| **Suggestions** | ${suggestionCount} |

---

## 📝 Summary

${analysisData.summary || "No summary available."}

`;

  if (analysisData.designAnalysis?.architecturalPattern) {
    md += `---

## 🏗️ Architectural Pattern

**${analysisData.designAnalysis.architecturalPattern.name}** (${analysisData.designAnalysis.architecturalPattern.confidence} confidence)

${analysisData.designAnalysis.architecturalPattern.description}

`;
  }

  if (analysisData.mainTechnologies && analysisData.mainTechnologies.length > 0) {
    md += `---

## 🛠️ Technologies

${analysisData.mainTechnologies.map((t) => `- ${t}`).join("\n")}

`;
  }

  const criticalIssues = analysisData.healthMetrics?.criticalIssues ?? [];
  if (criticalIssues.length > 0) {
    md += `---

## 🚨 Critical Issues

${criticalIssues
  .map(
    (issue) => `### ${issue.title}

${issue.description}

${issue.affectedFiles && issue.affectedFiles.length > 0 ? `**Affected Files:** ${issue.affectedFiles.map((f) => "`" + f + "`").join(", ")}` : ""}
`
  )
  .join("\n")}
`;
  }

  const warnings = analysisData.healthMetrics?.warnings ?? [];
  if (warnings.length > 0) {
    md += `---

## ⚠️ Warnings

${warnings
  .map(
    (warning) => `### ${warning.title}

${warning.description}

${warning.whyItMatters ? `**Why it matters:** ${warning.whyItMatters}` : ""}

${warning.suggestedFix ? `**Suggested fix:** ${warning.suggestedFix}` : ""}
`
  )
  .join("\n")}
`;
  }

  const suggestions = analysisData.healthMetrics?.suggestions ?? [];
  if (suggestions.length > 0) {
    md += `---

## 💡 Suggestions

${suggestions
  .map(
    (suggestion) => `### ${suggestion.title} (${suggestion.priority} priority)

${suggestion.description}

${suggestion.benefit ? `**Benefit:** ${suggestion.benefit}` : ""}
`
  )
  .join("\n")}
`;
  }

  md += `---

*Report generated by [CodeSight](${window.location.origin}) - AI-Powered Code Analysis*
`;

  return md;
};

// Download markdown file
export const downloadMarkdown = (options: ExportOptions): void => {
  const markdown = generateMarkdown(options);
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CodeSight-Analysis-${options.repositoryName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

// Generate share token
export const generateShareToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
