"use client";

import { useEffect, useRef } from "react";
import { BookOpen, ExternalLink, FileText, Network, X } from "lucide-react";
import type { Citation } from "@/lib/types";

/**
 * The source behind a citation, opened as a pop-up over the chat (like the sources in Claude or Perplexity)
 * instead of taking over the side panel. Document passages show the exact excerpt Lirava retrieved,
 * highlighted, with a link that opens the file at that page; statutes show their act and section.
 *
 * A native modal <dialog>: the browser makes the page inert, keeps focus inside, closes on Esc, and returns
 * focus to the chip that opened it. Clicking outside also closes it (closedby="any", with a fallback below
 * for browsers that do not support it yet).
 */
export function SourcePopup({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Closing fades the card out first. Firefox and Safari cannot animate a top-layer exit in CSS alone, so every close
  // (Esc, click outside, the close button) goes through here: data-closing starts the transition back to the closed
  // look, and the dialog is really closed once it has finished (or after a short cap).
  const dismiss = async () => {
    const dialog = ref.current;
    if (!dialog || !dialog.open || dialog.hasAttribute("data-closing")) return;
    dialog.setAttribute("data-closing", "");
    const running = dialog.getAnimations().map((animation) => animation.finished);
    if (running.length) await Promise.race([Promise.allSettled(running), new Promise((resolve) => setTimeout(resolve, 400))]);
    if (dialog.isConnected && dialog.open) dialog.close();
  };

  const isDocument = citation.kind === "document";
  const isCase = citation.kind === "case";
  const title = isDocument ? citation.name : citation.title;
  const where = isDocument
    ? `${citation.unit === "page" ? "Page" : "Section"} ${citation.page}`
    : isCase
      ? [citation.section, citation.date].filter(Boolean).join(" · ")
      : [citation.act, citation.section].filter(Boolean).join(" · ");
  const href = isDocument
    ? `/api/files/${encodeURIComponent(citation.fileId)}${citation.unit === "page" ? `#page=${citation.page}` : "?download=1"}`
    : null;

  // Fallback for browsers without closedby (Safari): a click on the backdrop targets the dialog itself,
  // so close when the pointer is outside its box. Clicks on its padding or children are ignored.
  const closeOnBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    if ("closedBy" in HTMLDialogElement.prototype || event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) void dismiss();
  };

  return (
    <dialog
      ref={ref}
      // closedby is newly shipped, so React's types do not list it yet.
      {...({ closedby: "any" } as object)}
      aria-labelledby="source-popup-title"
      onClose={onClose}
      onCancel={(event) => {
        // Esc, the back gesture and a click outside all arrive here first: fade out, then close.
        event.preventDefault();
        void dismiss();
      }}
      onClick={closeOnBackdrop}
      className="source-popup"
    >
      <div className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
        <span className="mt-0.5 inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-brand/50 bg-highlight px-1.5 font-mono text-[11px] font-medium text-brand-readable">
          {citation.label}
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="source-popup-title" className="text-[15px] font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
            {title}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            {isDocument ? <FileText className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> : isCase ? <Network className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> : <BookOpen className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />}
            <span className="font-mono">{where || (isDocument ? "Document" : isCase ? "Case tree" : "Statute")}</span>
          </p>
        </div>
        <button type="button" onClick={() => void dismiss()} aria-label="Close source" className="btn-quiet size-8 shrink-0 p-0">
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {isDocument ? (
          <blockquote className="rounded-xl border border-border bg-card p-5">
            <p className="text-[14px] leading-[1.9] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
              <mark className="source-popup-mark rounded-[2px] bg-transparent text-foreground">{citation.excerpt}</mark>
            </p>
          </blockquote>
        ) : citation.kind === "case" ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[15px] font-medium text-foreground">{citation.title}</p>
            {citation.date && <p className="mt-1 font-mono text-[12px] text-muted">{citation.date}</p>}
            {citation.body && <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-foreground/85">{citation.body}</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
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

        <p className="mt-5 text-[12px] leading-relaxed text-muted">
          {isDocument
            ? "This is the passage Lirava retrieved from your document. Check it against the file before relying on it."
            : isCase
              ? "This is an entry in this matter's case tree that your team confirmed. It records a fact of the case; it is not legal authority."
              : "Statute text is kept with its source so the provision can be checked."}
        </p>
      </div>
    </dialog>
  );
}
