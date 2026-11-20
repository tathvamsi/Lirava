"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { StackedSections } from "@/components/SettingsKit";
import { closeSettings, openSettings, useSettingsTab } from "@/lib/settings-modal";
import { TABS, type TabGroup } from "./registry";

const GROUPS: Array<{ id: TabGroup; label: string | null }> = [
  { id: "settings", label: null },
  { id: "library", label: "Library" },
  { id: "legal", label: "Legal" },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The settings dialog. It opens over the current page; every account-menu item opens it on its own tab. */
export default function SettingsModal() {
  const tab = useSettingsTab();
  return tab === null ? null : <Dialog tab={tab} />;
}

function Dialog({ tab }: { tab: string }) {
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const Panel = active.panel;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog, the page behind it stops scrolling, and both are undone on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  // Tab and Shift+Tab cycle inside the dialog instead of reaching the page behind it.
  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/55 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && closeSettings()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="flex h-full w-full max-w-[980px] flex-col overflow-hidden bg-background text-foreground shadow-elevated outline-none animate-page-rise sm:h-[min(740px,92vh)] sm:rounded-2xl sm:border sm:border-border md:flex-row"
      >
        <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:w-[224px] md:flex-col md:overflow-y-auto md:border-r md:border-b-0 md:p-3">
          <p className="hidden px-2.5 pt-1 pb-2 text-[15px] font-medium md:block">Settings</p>
          {GROUPS.map((g) => (
            <div key={g.id} className="flex gap-1 md:flex-col">
              {g.label && <p className="hidden px-2.5 pt-3 pb-1 text-[11px] font-medium tracking-wide text-foreground/45 uppercase md:block">{g.label}</p>}
              {TABS.filter((t) => t.group === g.id).map((t) => {
                const Icon = t.icon;
                const on = t.id === active.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openSettings(t.id)}
                    aria-current={on ? "page" : undefined}
                    className={`flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] whitespace-nowrap transition-colors ${on ? "bg-highlight font-medium text-foreground" : "text-foreground/65 hover:bg-highlight hover:text-foreground"}`}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-5">
            <h2 id={titleId} className="flex-1 truncate text-[15px] font-medium">
              {active.label}
            </h2>
            <button type="button" onClick={closeSettings} aria-label="Close settings" className="btn-quiet size-8 p-0">
              <X className="size-4" strokeWidth={1.75} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <StackedSections value>
              <Panel key={active.id} />
            </StackedSections>
          </div>
        </div>
      </div>
    </div>
  );
}
