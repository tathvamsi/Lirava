"use client";

import { BookOpen, FileText } from "lucide-react";
import type { Citation } from "@/lib/types";

/**
 * The sources an answer drew on, as a strip of numbered chips under it. A chip opens its source beside the
 * chat (the same numbers appear inline in the answer); without a handler, document chips link to the file at
 * the page it came from and statute chips are listed with their act and section.
 */
export function SourceList({ citations, onOpen }: { citations: Citation[]; onOpen?: (citation: Citation) => void }) {
  if (!citations.length) return null;

  return (
    <div className="mt-4" role="group" aria-label={`Sources (${citations.length})`}>
      <p className="mb-2 text-[12px] text-muted">
        {citations.length} source{citations.length === 1 ? "" : "s"}
      </p>
      <ul className="flex flex-wrap gap-2">
        {citations.map((c) => {
          const isDocument = c.kind === "document";
          const Icon = isDocument ? FileText : BookOpen;
          const text = isDocument ? `${c.name}, ${c.unit === "page" ? "p." : "s."} ${c.page}` : [c.title, c.section].filter(Boolean).join(", ");
          const body = (
            <>
              <span className="font-mono text-[10px] text-brand-readable">{c.label}</span>
              <Icon className="size-3 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              <span className="max-w-[26ch] truncate">{text}</span>
            </>
          );
          const cls =
            "inline-flex h-8 items-center gap-1.5 rounded-[999px] border border-border px-3 text-[12px] font-medium text-foreground/80 transition-colors hover:border-brand/40 hover:text-foreground";
          return (
            <li key={`${c.label}-${isDocument ? `${c.fileId}-${c.page}` : c.title}`}>
              {onOpen ? (
                <button type="button" onClick={() => onOpen(c)} className={cls} title={isDocument ? c.excerpt : undefined}>
                  {body}
                </button>
              ) : isDocument ? (
                <a
                  href={`/api/files/${encodeURIComponent(c.fileId)}${c.unit === "page" ? `#page=${c.page}` : "?download=1"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                >
                  {body}
                </a>
              ) : (
                <span className={cls}>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
