"use client";

import { useMemo, useState } from "react";
import { Attachment } from "@/lib/uploads";
import { Expand } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

function absoluteUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}

function lowerExt(name?: string) {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

function isImage(att: Attachment) {
  const ct = att.contentType?.toLowerCase() ?? "";
  const ext = lowerExt(att.name);
  return (
    ct.startsWith("image/") ||
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "bmp",
      "svg",
      "heic",
      "avif",
    ].includes(ext)
  );
}

function isVideo(att: Attachment) {
  const ct = att.contentType?.toLowerCase() ?? "";
  const ext = lowerExt(att.name);
  return (
    ct.startsWith("video/") ||
    ["mp4", "webm", "mov", "mkv", "avi", "m4v", "3gp", "mpeg"].includes(ext)
  );
}

function isAudio(att: Attachment) {
  const ct = att.contentType?.toLowerCase() ?? "";
  const ext = lowerExt(att.name);
  return (
    ct.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"].includes(ext)
  );
}

function isPdf(att: Attachment) {
  const ct = att.contentType?.toLowerCase() ?? "";
  const ext = lowerExt(att.name);
  return ct.includes("pdf") || ext === "pdf";
}

function isTextLike(att: Attachment) {
  const ct = att.contentType?.toLowerCase() ?? "";
  const ext = lowerExt(att.name);
  return (
    ct.startsWith("text/") ||
    [
      "md",
      "txt",
      "json",
      "csv",
      "xml",
      "yaml",
      "yml",
      "log",
      "ts",
      "tsx",
      "js",
      "jsx",
      "py",
      "cs",
      "java",
      "go",
      "rs",
      "html",
      "css",
      "sql",
      "sh",
      "toml",
      "ini",
    ].includes(ext)
  );
}

function isOfficeDoc(att: Attachment) {
  const ext = lowerExt(att.name);
  return [
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "odt",
    "odp",
    "ods",
  ].includes(ext);
}

function isArchive(att: Attachment) {
  const ext = lowerExt(att.name);
  return ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext);
}

function formatBytes(size?: number) {
  if (!size || size < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments?: Attachment[];
  onRemove?: (index: number) => void;
}) {
  const rows = attachments ?? [];
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);
  const overlayAttachment = useMemo(
    () => (overlayIndex === null ? null : (rows[overlayIndex] ?? null)),
    [overlayIndex, rows],
  );
  const overlayHref = absoluteUrl(overlayAttachment?.url);
  if (rows.length === 0) return null;

  const canOverlay = (att: Attachment) =>
    isImage(att) ||
    isVideo(att) ||
    isAudio(att) ||
    isPdf(att) ||
    isTextLike(att);

  return (
    <>
      <div className="mt-2 grid gap-2">
        {rows.map((att, idx) => {
          const href = absoluteUrl(att.url);
          const previewable = canOverlay(att) && !!href;

          return (
            <div key={`${att.url}-${idx}`} className="rounded-md border p-2">
              {isImage(att) && href ? (
                <button
                  type="button"
                  className="block"
                  onClick={() => previewable && setOverlayIndex(idx)}
                >
                  <img
                    src={href}
                    alt={att.name ?? "attachment"}
                    className="max-h-56 w-auto rounded object-contain"
                  />
                </button>
              ) : null}

              {isVideo(att) && href ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => previewable && setOverlayIndex(idx)}
                >
                  <video
                    src={href}
                    className="max-h-56 w-full rounded object-contain"
                    controls
                    preload="metadata"
                  />
                </button>
              ) : null}

              {isAudio(att) && href ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => previewable && setOverlayIndex(idx)}
                >
                  <audio
                    src={href}
                    className="w-full"
                    controls
                    preload="metadata"
                  />
                </button>
              ) : null}

              {isPdf(att) && href ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => previewable && setOverlayIndex(idx)}
                >
                  <iframe
                    src={href}
                    className="h-56 w-full rounded border"
                    title={att.name ?? "PDF preview"}
                  />
                </button>
              ) : null}

              {!isImage(att) &&
              !isVideo(att) &&
              !isAudio(att) &&
              !isPdf(att) &&
              !isTextLike(att) &&
              !isOfficeDoc(att) &&
              !isArchive(att) ? (
                <div className="mb-2 rounded border border-dashed p-3 text-xs text-muted-foreground">
                  Preview unavailable
                </div>
              ) : null}

              {(isTextLike(att) || isOfficeDoc(att) || isArchive(att)) &&
              !isImage(att) &&
              !isVideo(att) &&
              !isAudio(att) &&
              !isPdf(att) ? (
                <button
                  type="button"
                  className="mb-2 rounded border px-2 py-1 text-xs text-muted-foreground"
                  onClick={() => previewable && setOverlayIndex(idx)}
                >
                  {isTextLike(att)
                    ? "Text/Code file"
                    : isOfficeDoc(att)
                      ? "Office document"
                      : "Archive"}
                </button>
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
                {att.contentType ?? "file"}
                {att.size ? ` • ${formatBytes(att.size)}` : ""}
                <div className="w-20px"></div>
                {previewable ? (
                  <button
                    type="button"
                    className="text-muted-foreground"
                    onClick={() => previewable && setOverlayIndex(idx)}
                  >
                    <Expand />
                  </button>
                ) : (
                  ""
                )}
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

      {overlayAttachment && overlayHref && (
        <div
          className="fixed inset-0 z-[80] bg-black/75 p-4 md:p-8"
          onClick={() => setOverlayIndex(null)}
        >
          <div
            className="mx-auto flex h-full max-w-6xl flex-col rounded-md border bg-background p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium">
                {overlayAttachment.name ?? "Attachment preview"}
              </p>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={() => setOverlayIndex(null)}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded border bg-black/20 p-2">
              {isImage(overlayAttachment) ? (
                <img
                  src={overlayHref}
                  alt={overlayAttachment.name ?? "attachment"}
                  className="mx-auto h-auto max-h-[78vh] w-auto max-w-full rounded object-contain"
                />
              ) : null}
              {isVideo(overlayAttachment) ? (
                <video
                  src={overlayHref}
                  className="mx-auto max-h-full w-full rounded object-contain"
                  controls
                  autoPlay
                />
              ) : null}
              {isAudio(overlayAttachment) ? (
                <div className="flex h-full items-center justify-center">
                  <audio
                    src={overlayHref}
                    className="w-full max-w-2xl"
                    controls
                    autoPlay
                  />
                </div>
              ) : null}
              {isPdf(overlayAttachment) ? (
                <iframe
                  src={overlayHref}
                  className="h-full w-full rounded"
                  title={overlayAttachment.name ?? "PDF preview"}
                />
              ) : null}
              {isTextLike(overlayAttachment) ? (
                <iframe
                  src={overlayHref}
                  className="h-full w-full rounded"
                  title={overlayAttachment.name ?? "Text preview"}
                />
              ) : null}
              {!isImage(overlayAttachment) &&
              !isVideo(overlayAttachment) &&
              !isAudio(overlayAttachment) &&
              !isPdf(overlayAttachment) &&
              !isTextLike(overlayAttachment) ? (
                <div className="flex h-full items-center justify-center">
                  <a
                    href={overlayHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border px-3 py-2 text-sm underline"
                  >
                    Open
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
