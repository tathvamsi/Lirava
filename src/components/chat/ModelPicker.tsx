"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Cpu, Globe } from "lucide-react";
import { setSelectedProvider, useSelectedProvider, type ProviderOption } from "@/lib/provider";

/**
 * Chooses which AI model answers in the chat: Lirava's own model, NVIDIA or Sarvam. The choice is kept in this browser
 * and sent with every message. A model that is not set up on the server is shown but cannot be chosen, with the reason.
 */
export default function ModelPicker({ placement = "up" }: { placement?: "up" | "down" }) {
  const [options, setOptions] = useState<ProviderOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const stored = useSelectedProvider();
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // The list is drawn on the page itself, not inside the composer, whose edges would cut it off.
  const [box, setBox] = useState<{ left: number; bottom?: number; top?: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = button.current?.getBoundingClientRect();
      if (!r) return;
      const width = 288;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const above = r.top - 12;
      const below = window.innerHeight - r.bottom - 12;
      // Open upward when that has the room (the composer sits at the bottom of the page), else downward.
      if (placement === "up" ? above >= 200 || above >= below : below < 200 && above > below) setBox({ left, bottom: window.innerHeight - r.top + 8, maxHeight: Math.max(160, above) });
      else setBox({ left, top: r.bottom + 8, maxHeight: Math.max(160, below) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, placement]);

  useEffect(() => {
    let active = true;
    fetch("/api/agent/providers", { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { providers: ProviderOption[] }) => active && setOptions(data.providers))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menu.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A saved choice the server no longer offers (a key removed, a setting changed) is forgotten, so it is never sent.
  useEffect(() => {
    if (options && stored && !options.some((o) => o.id === stored && o.available)) setSelectedProvider(undefined);
  }, [options, stored]);

  // Nothing to choose between until the list is known, or when the server cannot be asked.
  if (failed || !options) return null;

  // A stored choice that is no longer set up falls back to the server's default instead of failing every message.
  const usable = options.filter((o) => o.available);
  const current = usable.find((o) => o.id === stored) ?? usable.find((o) => o.isDefault) ?? usable[0];
  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Model: ${current.label} (${current.model})`}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-[12px] text-foreground/80 transition-colors hover:bg-highlight"
      >
        {current.hosted ? <Globe className="size-3 shrink-0" strokeWidth={1.75} /> : <Cpu className="size-3 shrink-0" strokeWidth={1.75} />}
        <span className="max-w-32 truncate">{current.label}</span>
        <ChevronDown className="size-3 shrink-0 text-foreground/50" strokeWidth={2} />
      </button>

      {open && box && createPortal(
        <div
          ref={menu}
          role="listbox"
          aria-label="Choose the AI model"
          style={{ position: "fixed", left: box.left, bottom: box.bottom, top: box.top, maxHeight: box.maxHeight, width: 288 }}
          className="z-[1000] overflow-y-auto rounded-xl border border-border bg-background py-1.5 text-foreground shadow-elevated animate-page-rise"
        >
          <p className="px-3 pt-1.5 pb-1 text-[12px] text-foreground/55">Which model answers your messages.</p>
          <ul>
            {options.map((o) => {
              const on = o.id === current.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={!o.available}
                    onClick={() => {
                      setSelectedProvider(o.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-brand-readable">{on && <Check className="size-4" strokeWidth={2.5} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">
                        {o.label}
                        {o.isDefault && <span className="ml-1.5 text-[11px] text-foreground/45">default</span>}
                      </span>
                      <span className="block truncate font-mono text-[10.5px] text-foreground/50">{o.model}</span>
                      <span className={`block text-[11.5px] ${o.available && o.hosted ? "text-amber-700 dark:text-amber-400" : "text-foreground/55"}`}>{o.note}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
