"use client";

import { Attachment } from "@/lib/uploads";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

function absoluteUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}

function isImage(att: Attachment) {
  const ct = att.contentType?.toLowerCase() ?? "";
  return ct.startsWith("image/");
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments?: Attachment[];
  onRemove?: (index: number) => void;
}) {
  const rows = attachments ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="mt-2 grid gap-2">
      {rows.map((att, idx) => {
        const href = absoluteUrl(att.url);
        return (
          <div key={`${att.url}-${idx}`} className="rounded-md border p-2">
            {isImage(att) && href ? (
              <a href={href} target="_blank" rel="noreferrer">
                <img
                  src={href}
                  alt={att.name ?? "attachment"}
                  className="max-h-56 w-auto rounded object-contain"
                />
              </a>
            ) : null}
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block text-sm underline break-all"
            >
              {att.name ?? "Download attachment"}
            </a>
            <div className="text-xs text-muted-foreground">
              {att.contentType ?? "file"} {att.size ? `• ${att.size} bytes` : ""}
            </div>
            {onRemove && (
              <button
                type="button"
                className="mt-2 text-xs underline text-red-600 dark:text-red-400"
                onClick={() => onRemove(idx)}
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
