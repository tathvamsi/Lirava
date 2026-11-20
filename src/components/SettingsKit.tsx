"use client";

import { createContext, useContext } from "react";

const StackedContext = createContext(false);

/** Inside a narrow container (the settings dialog) sections stack instead of sitting in two columns. */
export const StackedSections = StackedContext.Provider;

/** Two-column settings block: label + description on the left, controls on the right. Stacked inside a <StackedSections value>. */
export function Section({ id, eyebrow, title, description, children }: { id?: string; eyebrow?: string; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  const stacked = useContext(StackedContext);
  return (
    <section id={id} className={`grid gap-4 border-t border-border/60 first:border-t-0 first:pt-2 ${stacked ? "py-6" : "py-8 md:grid-cols-[240px_1fr] md:gap-10"}`}>
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="text-[15px] leading-snug font-medium">{title}</h2>
        {description && <p className="mt-1.5 text-body-sm text-foreground/55">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="pt-10 pb-6">
      <div className="eyebrow text-brand-readable/80">{eyebrow}</div>
      <h1 className="text-h1 mt-2">{title}</h1>
      {description && <p className="mt-2 max-w-[560px] text-body-sm text-foreground/55">{description}</p>}
    </div>
  );
}
