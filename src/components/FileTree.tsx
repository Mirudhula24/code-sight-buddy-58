import { Folder, File, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileItem {
  name: string;
  type: "file" | "folder";
  children?: FileItem[];
  extension?: string;
}

const mockFileTree: FileItem[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Header.tsx", type: "file", extension: "tsx" },
          { name: "Sidebar.tsx", type: "file", extension: "tsx" },
          { name: "Button.tsx", type: "file", extension: "tsx" },
        ],
      },
      {
        name: "services",
        type: "folder",
        children: [
          { name: "api.ts", type: "file", extension: "ts" },
          { name: "auth.ts", type: "file", extension: "ts" },
        ],
      },
      { name: "App.tsx", type: "file", extension: "tsx" },
      { name: "main.tsx", type: "file", extension: "tsx" },
    ],
  },
  { name: "package.json", type: "file", extension: "json" },
  { name: "README.md", type: "file", extension: "md" },
];

const getFileColor = (extension?: string) => {
  switch (extension) {
    case "tsx":
    case "ts":
      return "text-code-blue";
    case "json":
      return "text-code-yellow";
    case "md":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
};

interface TreeNodeProps {
  item: FileItem;
  depth?: number;
  selectedFile?: string;
  onSelect?: (name: string) => void;
}

const TreeNode = ({ item, depth = 0, selectedFile, onSelect }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isFolder = item.type === "folder";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors duration-150",
          "hover:bg-secondary/60",
          selectedFile === item.name && "bg-secondary text-primary"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen);
          } else {
            onSelect?.(item.name);
          }
        }}
      >
        {isFolder ? (
          <>
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Folder className="w-4 h-4 text-code-yellow" />
          </>
        ) : (
          <>
            <span className="w-4" />
            <File className={cn("w-4 h-4", getFileColor(item.extension))} />
          </>
        )}
        <span className={cn("text-sm font-mono", getFileColor(item.extension))}>
          {item.name}
        </span>
      </div>
      
      {isFolder && isOpen && item.children && (
        <div>
          {item.children.map((child, index) => (
            <TreeNode
              key={index}
              item={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeProps {
  className?: string;
}

const FileTree = ({ className }: FileTreeProps) => {
  const [selectedFile, setSelectedFile] = useState<string>("App.tsx");

  return (
    <div className={cn("py-2", className)}>
      {mockFileTree.map((item, index) => (
        <TreeNode
          key={index}
          item={item}
          selectedFile={selectedFile}
          onSelect={setSelectedFile}
        />
      ))}
    </div>
  );
};

export default FileTree;
