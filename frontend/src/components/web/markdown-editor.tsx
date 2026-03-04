"use client";

import MDEditor from "@uiw/react-md-editor";
import { useTheme } from "next-themes";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write in markdown...",
  minRows = 4,
  className = "",
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const editorHeight = Math.max(minRows * 24 + 140, 220);

  return (
    <div data-color-mode={colorMode} className={`w-full min-w-0 ${className}`}>
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview="live"
        height={editorHeight}
        visibleDragbar={false}
        style={{ width: "100%", minWidth: 0 }}
        textareaProps={{
          placeholder,
          rows: minRows,
        }}
      />
    </div>
  );
}
