"use client";

import { BookCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CiteVerdict } from "@/lib/types";
import { CHECK_FOOTNOTE, describeVerdict, distinctVerdicts, summariseVerdicts, summaryLine, translationNames, type Tone } from "@/lib/citationCheck";

/**
 * What the citation checker found in an answer: one line per case or section cited, with what it means in plain words.
 * It is shown under the answer and opens by itself when something needs a look. A label is always written out, never colour alone.
 *
 * The findings are live: the API does not keep them, so after a reload the line is gone until the next answer.
 */
const ICON: Record<Tone, typeof BookCheck> = { ok: BookCheck, look: TriangleAlert, none: CircleHelp };
const ICON_CLASS: Record<Tone, string> = { ok: "text-brand-readable", look: "text-foreground", none: "text-muted" };
const LABEL_CLASS: Record<Tone, string> = { ok: "border-border text-foreground/80", look: "border-foreground/40 font-semibold text-foreground", none: "border-border text-muted" };

/** Reads the findings for one message from the store. */
export function CitationCheck({ messageId }: { messageId: string }) {
  const check = useStore((s) => s.citationChecks[messageId]);
  return check ? <CitationCheckView verdicts={check.verdicts} /> : null;
}

/** The findings as written lines. Separate from the store so it can be rendered from plain data. */
export function CitationCheckView({ verdicts }: { verdicts: CiteVerdict[] }) {
  const rows = distinctVerdicts(verdicts);
  if (!rows.length) return null;

  const summary = summariseVerdicts(rows);
  const needsAttention = summary.needsLook > 0;

  return (
    <details className="mt-4 rounded-xl border border-border px-3 py-2" open={needsAttention || undefined} aria-label="Citation check">
      <summary className="cursor-pointer select-none text-[12px] font-medium text-foreground/80">
        Citation check · {summaryLine(summary)}
      </summary>
      <ul className="mt-2 flex flex-col gap-2.5">
        {rows.map((v, i) => {
          const view = describeVerdict(v);
          const Icon = ICON[view.tone];
          const languages = translationNames(v.translations);
          return (
            <li key={`${v.raw}-${v.reason}-${v.library_title ?? i}`} className="flex gap-2">
              <Icon className={`mt-[3px] size-3.5 shrink-0 ${ICON_CLASS[view.tone]}`} strokeWidth={1.75} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="break-words font-mono text-[12px] text-foreground/90">{v.raw}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${LABEL_CLASS[view.tone]}`}>{view.label}</span>
                </div>
                <p className="mt-0.5 text-[12px] leading-[1.5] text-foreground/65">{view.meaning}</p>
                {v.library_citation && v.status === "partial" && <p className="text-[12px] text-foreground/65">The library lists this citation as {v.library_citation}.</p>}
                {languages.length > 0 && <p className="text-[12px] text-foreground/65">Also published by the Court in {languages.join(", ")}.</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2.5 text-[11px] leading-[1.5] text-muted">{CHECK_FOOTNOTE}</p>
    </details>
  );
}
