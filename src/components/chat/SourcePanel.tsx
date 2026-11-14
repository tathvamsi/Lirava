"use client";

import { motion } from "framer-motion";
import { BookOpen, ExternalLink, FileText, X } from "lucide-react";
import type { Citation } from "@/lib/types";

const MARK_STYLE = {
  backgroundImage:
    "linear-gradient(color-mix(in oklab, var(--brand) 30%, transparent), color-mix(in oklab, var(--brand) 30%, transparent))",
  backgroundRepeat: "no-repeat",
  WebkitBoxDecorationBreak: "clone",
  boxDecorationBreak: "clone",
} as const;

/**
 * The source behind a citation, opened beside the chat. Document passages show the exact excerpt Lirava
 * retrieved, highlighted, with a link that opens the file at that page; statutes show their act and section.
 */
export function SourcePanel({
  citation,
  onClose,
  width,
}: {
  citation: Citation;
  onClose: () => void;
  width: number;
}) {
  const isDocument = citation.kind === "document";
  const title = isDocument ? citation.name : citation.title;
  const where = isDocument ? `${citation.unit === "page" ? "Page" : "Section"} ${citation.page}` : [citation.act, citation.section].filter(Boolean).join(" · ");
  const href = isDocument
    ? `/api/files/${encodeURIComponent(citation.fileId)}${citation.unit === "page" ? `#page=${citation.page}` : "?download=1"}`
    : null;

  return (
    <aside
      aria-label={`Source ${citation.label}`}
      style={{ ["--source-width" as string]: `${width}px` }}
      className="fixed inset-0 z-40 flex min-h-0 flex-col bg-background lg:static lg:z-auto lg:w-[var(--source-width)] lg:max-w-[calc(100%-320px)] lg:shrink-0 lg:border-l lg:border-border"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[6px] border border-brand/50 bg-highlight px-1.5 font-mono text-[11px] font-medium text-brand-readable">
          {citation.label}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close source"
          className="btn-quiet size-8 shrink-0 p-0"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          {isDocument ? <FileText className="size-3.5" strokeWidth={1.75} /> : <BookOpen className="size-3.5" strokeWidth={1.75} />}
          <span className="font-mono">{where || (isDocument ? "Document" : "Statute")}</span>
        </div>

        {isDocument ? (
          <motion.blockquote
            key={`${citation.fileId}-${citation.page}-${citation.label}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 rounded-xl border border-border bg-card p-5"
          >
            <p className="text-[14px] leading-[1.9] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
              <motion.mark
                className="rounded-[2px] bg-transparent text-foreground"
                style={MARK_STYLE}
                initial={{ backgroundSize: "0% 100%" }}
                animate={{ backgroundSize: "100% 100%" }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {citation.excerpt}
              </motion.mark>
            </p>
          </motion.blockquote>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <p className="text-[15px] font-medium text-foreground">{citation.title}</p>
            {(citation.act || citation.section) && <p className="mt-1 text-[13px] text-muted">{[citation.act, citation.section].filter(Boolean).join(" · ")}</p>}
            {citation.source && <p className="mt-3 text-[12px] text-muted">{citation.source}</p>}
          </div>
        )}

        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-5 inline-flex">
            {citation.kind === "document" && citation.unit === "page" ? `Open at page ${citation.page}` : "Open file"}
            <ExternalLink className="size-3.5" />
          </a>
        )}

        <p className="mt-6 text-[12px] leading-relaxed text-muted">
          {isDocument
            ? "This is the passage Lirava retrieved from your document. Check it against the file before relying on it."
            : "Statute text is kept with its source so the provision can be checked."}
        </p>
      </div>
    </aside>
  );
}
