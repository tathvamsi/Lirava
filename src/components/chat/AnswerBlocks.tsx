"use client";

import { ArrowRight, BookCheck, CircleHelp, Link2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { CERTAINTY_NOTE, type Certainty } from "@/lib/answerFormat";

/**
 * The blocks an answer is shown in: the Bottom line first (with how much it can be relied on), then the body, then what the
 * sources leave open (Gaps) and what to do next. The text of each block is passed in already rendered, so citation chips
 * work inside them. A label is always written out, never colour alone.
 */
const TONE_ICON = { ok: BookCheck, look: TriangleAlert, plain: Link2, none: CircleHelp } as const;
const TONE_CLASS = {
  ok: "border-border text-foreground/80",
  look: "border-foreground/40 font-semibold text-foreground",
  plain: "border-border text-foreground/70",
  none: "border-border text-muted",
} as const;
const LABEL = "text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-foreground/60";

export function BottomLine({ children, certainty }: { children: ReactNode; certainty: Certainty | null }) {
  const Icon = certainty ? TONE_ICON[certainty.tone] : null;
  return (
    <section aria-label="Bottom line" data-answer-block="bottom-line" className="mb-3.5 border-l-2 border-brand pl-3.5">
      <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={LABEL}>Bottom line</span>
        {certainty && Icon && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5" title={CERTAINTY_NOTE}>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${TONE_CLASS[certainty.tone]}`}>
              <Icon className="size-3" strokeWidth={1.75} aria-hidden />
              {certainty.label}
            </span>
            <span className="text-[11px] text-muted">{certainty.detail}</span>
          </span>
        )}
      </div>
      <div className="text-[15.5px] font-medium leading-[1.55] text-foreground [&_p]:m-0">{children}</div>
    </section>
  );
}

/**
 * What is left open. `children` is the model's own note (when it wrote one); `unconfirmed` lists the citations the library checker
 * could not confirm, which are worked out by the app and so can be relied on.
 */
export function GapsBlock({ children, unconfirmed = [] }: { children?: ReactNode; unconfirmed?: string[] }) {
  return (
    <section aria-label="Gaps" data-answer-block="gaps" className="mt-4 rounded-xl border border-dashed border-border px-3.5 py-2.5">
      <div className={`${LABEL} mb-1.5`}>Gaps</div>
      {children && <div className="text-[14px] leading-[1.55] text-foreground/80 [&_p]:m-0 [&_p+p]:mt-2">{children}</div>}
      {unconfirmed.length > 0 && (
        <div className={children ? "mt-2" : undefined}>
          <p className="text-[13px] leading-[1.5] text-foreground/70">The library could not confirm:</p>
          <ul className="mt-0.5 list-disc pl-5 text-[13px] leading-[1.5] text-foreground/80">
            {unconfirmed.map((line) => (
              <li key={line} className="break-words">{line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function NextMove({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Next move" data-answer-block="next-move" className="mt-3 flex items-start gap-2.5">
      <ArrowRight className="mt-[-1px] size-4 shrink-0 text-brand-readable" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0">
        <div className={`${LABEL} mb-1`}>Next move</div>
        <div className="text-[14.5px] leading-[1.55] text-foreground [&_p]:m-0 [&_p+p]:mt-2">{children}</div>
      </div>
    </section>
  );
}
