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
    <div
      data-color-mode={colorMode}
      className={`studyhive-md-editor w-full min-w-0 ${className}`}
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview="live"
        height={editorHeight}
        visibleDragbar={false}
        style={{ width: "100%", minWidth: 0, backgroundColor: "transparent" }}
        textareaProps={{
          placeholder,
          rows: minRows,
        }}
      />
      <style jsx global>{`
        .studyhive-md-editor .w-md-editor,
        .studyhive-md-editor .w-md-editor-toolbar,
        .studyhive-md-editor .w-md-editor-content,
        .studyhive-md-editor .w-md-editor-input,
        .studyhive-md-editor .w-md-editor-preview,
        .studyhive-md-editor .wmde-markdown,
        .studyhive-md-editor .wmde-markdown-var {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
