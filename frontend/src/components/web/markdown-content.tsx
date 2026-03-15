"use client";

import MarkdownPreview from "@uiw/react-markdown-preview";

export function MarkdownContent({
  content,
  className,
  style,
}: {
  content?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{ backgroundColor: "transparent", ...style }}>
      <MarkdownPreview
        source={content ?? ""}
        style={{ backgroundColor: "transparent" }}
      />
    </div>
  );
}
