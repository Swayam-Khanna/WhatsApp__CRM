"use client";

import { useState, useEffect } from "react";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  Eye,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatAttachment } from "@/lib/services/messagingService";

interface AttachmentPreviewModalProps {
  attachment: ChatAttachment | null;
  onClose: () => void;
}

/**
 * Convert a base64 Data URL to a Blob object
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(";base64,");
  const contentType = parts[0].replace("data:", "") || "application/octet-stream";
  const byteCharacters = atob(parts[1] || "");
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
}

export function AttachmentPreviewModal({
  attachment,
  onClose,
}: AttachmentPreviewModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [attachment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (attachment) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [attachment, onClose]);

  if (!attachment) return null;

  const isDeadBlob = attachment.url.startsWith("blob:");

  const isImage =
    (attachment.type === "image" ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(attachment.name) ||
      attachment.url.startsWith("data:image/")) &&
    !imgError &&
    !isDeadBlob;

  const isPdf =
    attachment.name.toLowerCase().endsWith(".pdf") ||
    attachment.url.startsWith("data:application/pdf");

  const isExpiredBlob = isDeadBlob || imgError;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDeadBlob) {
      toast.error("This test file from a previous session has expired. Please send a new attachment.");
      return;
    }

    try {
      if (attachment.url.startsWith("data:")) {
        const blob = dataUrlToBlob(attachment.url);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = attachment.name || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        const link = document.createElement("a");
        link.href = attachment.url;
        link.download = attachment.name || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      window.open(attachment.url, "_blank");
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDeadBlob) {
      toast.error("This test file from a previous session has expired. Please send a new attachment.");
      return;
    }

    try {
      if (attachment.url.startsWith("data:")) {
        const blob = dataUrlToBlob(attachment.url);
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        window.open(attachment.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      handleDownload(e);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attachment Preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#121815] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center shrink-0">
              {isImage ? (
                <ImageIcon className="h-5 w-5 text-emerald-400" />
              ) : isPdf ? (
                <FileText className="h-5 w-5 text-rose-400" />
              ) : (
                <File className="h-5 w-5 text-sky-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate text-white">
                {attachment.name}
              </h3>
              {attachment.size && (
                <p className="text-[11px] text-white/60">{attachment.size}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              title="Download file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 grid place-items-center text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close preview (Esc)"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center min-h-[320px] max-h-[75vh] bg-[#0A0E0C]">
          {isImage ? (
            <div className="relative max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.url}
                alt={attachment.name}
                onError={() => setImgError(true)}
                className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-lg"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] rounded-2xl overflow-hidden bg-white">
              <iframe
                src={attachment.url}
                title={attachment.name}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-4 max-w-md">
              <div className="h-16 w-16 rounded-2xl bg-white/10 text-white mx-auto grid place-items-center">
                {isExpiredBlob ? (
                  <AlertCircle className="h-8 w-8 text-amber-400" />
                ) : (
                  <FileText className="h-8 w-8 text-white/80" />
                )}
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">
                  {attachment.name}
                </h4>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  {isExpiredBlob
                    ? "This preview is from an earlier test session before persistent storage was enabled. All newly sent images and files are saved permanently and viewable anytime."
                    : "Direct in-browser visual preview is not available for this file type, but you can download or open it."}
                </p>
              </div>
              {!isExpiredBlob ? (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="font-subhead inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F3D2E] text-white hover:bg-[#154d3b] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="font-subhead inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open in Browser</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-emerald-400 font-medium">
                  ✨ Try sending a new photo or document in the chat below!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AttachmentBubbleCardProps {
  attachment: ChatAttachment;
  isOutgoing: boolean;
  onPreview: (attachment: ChatAttachment) => void;
}

export function AttachmentBubbleCard({
  attachment,
  isOutgoing,
  onPreview,
}: AttachmentBubbleCardProps) {
  const [imgError, setImgError] = useState(false);

  const isImage =
    (attachment.type === "image" ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(attachment.name) ||
      attachment.url.startsWith("data:image/")) &&
    !imgError &&
    !attachment.url.startsWith("blob:");

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onPreview(attachment);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview(attachment);
        }
      }}
      className={`group rounded-xl overflow-hidden cursor-pointer transition-all select-none ${
        isOutgoing
          ? "bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30"
          : "bg-white hover:bg-[#FAF8F5] text-foreground border border-border/80 hover:border-[#0F3D2E]/40 shadow-2xs"
      }`}
      title={`Click to view & open "${attachment.name}"`}
    >
      {isImage ? (
        <div className="space-y-1.5 p-1.5">
          {/* Image Thumbnail with hover overlay */}
          <div className="relative rounded-lg overflow-hidden max-h-48 bg-black/10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-48 w-full object-cover rounded-lg group-hover:scale-[1.02] transition-transform duration-200"
              onError={() => setImgError(true)}
            />
            {/* Hover overlay with Eye icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
              <span className="h-8 w-8 rounded-full bg-black/60 grid place-items-center shadow-xs">
                <Eye className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">View</span>
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center justify-between gap-2 px-1.5 py-0.5 text-[11px]">
            <span className="font-medium truncate flex-1">{attachment.name}</span>
            {attachment.size && (
              <span className="opacity-70 text-[10px] shrink-0">{attachment.size}</span>
            )}
          </div>
        </div>
      ) : (
        /* Document / file fallback card */
        <div className="flex items-center gap-2.5 p-2.5">
          <div
            className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
              isOutgoing ? "bg-white/15 text-white" : "bg-[#0F3D2E]/10 text-[#0F3D2E]"
            }`}
          >
            {/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(attachment.name) ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate text-xs">{attachment.name}</p>
            {attachment.size && (
              <p className="opacity-70 text-[10px]">{attachment.size}</p>
            )}
          </div>
          <div
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 shrink-0 ${
              isOutgoing
                ? "bg-white/20 text-white"
                : "bg-secondary text-foreground group-hover:bg-[#0F3D2E] group-hover:text-white transition-colors"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Open</span>
          </div>
        </div>
      )}
    </div>
  );
}
