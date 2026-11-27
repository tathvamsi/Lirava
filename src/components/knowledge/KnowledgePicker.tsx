"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check } from "lucide-react";
import { kbRequest, type KnowledgeBase, type LinkScope } from "@/lib/knowledge-api";

const MAX_ATTACHED = 5;

/** A button that lists the user's knowledge bases and attaches them to one chat or matter. */
export default function KnowledgePicker({ scope, id, placement = "up" }: { scope: LinkScope; id: string; placement?: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const [bases, setBases] = useState<KnowledgeBase[] | null>(null);
  const [attached, setAttached] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The list is drawn on the page body, not inside the message box, so the message box and the panels beside it cannot
  // clip or cover it. Its place comes from the button when it is opened.
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 288 - 8));
      setPos(placement === "up" ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: rect.bottom + 8 });
    }
    setOpen(true);
  };

  // The count on the button is shown without opening the list.
  useEffect(() => {
    let active = true;
    void kbRequest<{ knowledgeBases: KnowledgeBase[] }>(`/api/knowledge-bases/links?scope=${scope}&id=${encodeURIComponent(id)}`).then((res) => {
      if (active) setAttached(res.ok ? res.data.knowledgeBases.map((b) => b.id) : []);
    });
    return () => {
      active = false;
    };
  }, [scope, id]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void kbRequest<{ knowledgeBases: KnowledgeBase[] }>("/api/knowledge-bases").then((res) => {
      if (!active) return;
      setBases(res.ok ? res.data.knowledgeBases : []);
      if (!res.ok) setError(res.error);
    });
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || dialogRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      active = false;
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const toggle = async (baseId: string) => {
    const current = attached ?? [];
    const next = current.includes(baseId) ? current.filter((x) => x !== baseId) : [...current, baseId];
    if (next.length > MAX_ATTACHED) {
      setError(`Attach at most ${MAX_ATTACHED} knowledge bases.`);
      return;
    }
    setError("");
    setAttached(next);
    const res = await kbRequest<{ knowledgeBases: KnowledgeBase[] }>("/api/knowledge-bases/links", { method: "PUT", body: { scope, id, knowledgeIds: next } });
    if (!res.ok) {
      setAttached(current);
      setError(res.error);
    }
  };

  const count = attached?.length ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Knowledge: attach your document collections"
        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors hover:bg-highlight ${count ? "border-brand/50 text-foreground" : "border-border text-muted"}`}
      >
        <BookOpen className="size-3 shrink-0" strokeWidth={1.75} />
        Knowledge{count > 0 && <span className="font-mono text-[10.5px]">{count}</span>}
      </button>

      {open && pos && createPortal(
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Attach knowledge"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}
          className="fixed z-[70] w-72 overflow-hidden rounded-xl border border-border bg-background py-1.5 text-foreground shadow-elevated animate-page-rise"
        >
          <p className="px-3 pt-1.5 pb-1 text-[12px] text-foreground/55">Answers in this {scope === "matter" ? "matter" : "chat"} can use these collections.</p>
          {bases === null ? (
            <p className="px-3 py-3 text-[13px] text-foreground/45">Loading…</p>
          ) : bases.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-foreground/55">You have no knowledge bases yet.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {bases.map((b) => {
                const on = attached?.includes(b.id) ?? false;
                return (
                  <li key={b.id}>
                    <button type="button" role="checkbox" aria-checked={on} onClick={() => void toggle(b.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-highlight">
                      <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-brand bg-brand text-white" : "border-border"}`}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px]">{b.name}</span>
                        <span className="block font-mono text-[10.5px] text-foreground/50">{b.fileCount} {b.fileCount === 1 ? "file" : "files"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p role="alert" className="px-3 py-1.5 text-[12px] text-destructive">
              {error}
            </p>
          )}
          <div className="mt-1 border-t border-border px-3 pt-2 pb-1">
            <Link href="/knowledge" className="text-[12.5px] text-brand-readable hover:underline">
              Manage knowledge
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
