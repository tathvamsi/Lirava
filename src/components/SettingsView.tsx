"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "./SettingsKit";
import { TABS } from "./settings/registry";

const PAGE_TABS = TABS.filter((t) => t.group === "settings");

/** The /settings page: the same tabs as the settings dialog, for direct links and the connector pages. */
export default function SettingsView() {
  const requested = useSearchParams().get("tab");
  const active = PAGE_TABS.find((t) => t.id === requested) ?? PAGE_TABS[0];
  const Panel = active.panel;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="rails mx-auto min-h-full max-w-[1080px] px-4 pb-16 sm:px-8">
        <PageHeader eyebrow="Settings" title="Settings" description="Your account, preferences and data." />

        <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
          <nav aria-label="Settings sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
            {PAGE_TABS.map((t) => {
              const Icon = t.icon;
              const on = t.id === active.id;
              return (
                <Link
                  key={t.id}
                  href={`/settings?tab=${t.id}`}
                  replace
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] whitespace-nowrap transition-colors ${on ? "bg-highlight font-medium text-foreground" : "text-foreground/65 hover:bg-highlight hover:text-foreground"}`}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0">
            <Panel />
          </div>
        </div>
      </div>
    </div>
  );
}
