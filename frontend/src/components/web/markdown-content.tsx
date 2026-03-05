"use client";

import MarkdownPreview from "@uiw/react-markdown-preview";

export function MarkdownContent({
  content,
  className,
}: {
  content?: string;
  className?: string;
}) {
  return (
    <div className={className} style={{ backgroundColor: "transparent" }}>
      <MarkdownPreview
        source={content ?? ""}
        style={{ backgroundColor: "transparent" }}
      />
    </div>
  );
}
