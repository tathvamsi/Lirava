"use client";

import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Loader2 } from "lucide-react";
import type { DocumentArtifact } from "@/lib/types";
import { useArtifactSave } from "@/lib/artifacts/useArtifactSave";

const TASK = /^(\s*[-*]\s+)\[( |x|X)\]\s+(.*)$/;

type Chunk = { kind: "text"; text: string } | { kind: "task"; line: number; done: boolean; label: string };
type Section = { heading: string; chunks: Chunk[] };

/** Splits a plan written in markdown into its title and "## " sections, keeping each "- [ ]" line addressable. */
function parsePlan(content: string): { title: string; sections: Section[]; done: number; total: number } {
  const lines = content.split("\n");
  let title = "";
  const sections: Section[] = [];
  let current: Section = { heading: "", chunks: [] };
  let text: string[] = [];
  let done = 0;
  let total = 0;
  const flush = () => {
    if (text.join("").trim()) current.chunks.push({ kind: "text", text: text.join("\n").trim() });
    text = [];
  };
  lines.forEach((line, i) => {
    const h1 = /^#\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const task = TASK.exec(line);
    if (h1 && !title) {
      title = h1[1].trim();
    } else if (h2) {
      flush();
      if (current.heading || current.chunks.length) sections.push(current);
      current = { heading: h2[1].trim(), chunks: [] };
    } else if (task) {
      flush();
      const isDone = task[2].toLowerCase() === "x";
      total += 1;
      if (isDone) done += 1;
      current.chunks.push({ kind: "task", line: i, done: isDone, label: task[3].trim() });
    } else {
      text.push(line);
    }
  });
  flush();
  if (current.heading || current.chunks.length) sections.push(current);
  return { title, sections, done, total };
}

/**
 * Artifact mode: a plan or strategy laid out as sections the lawyer can follow. Action items are tick boxes, and
 * ticking one is saved into the plan itself, so the progress is still there next time it is opened.
 */
export function PlanView({ artifact }: { artifact: DocumentArtifact }) {
  const [content, setContent] = useState(artifact.content);
  const { state, change } = useArtifactSave(artifact.id);
  const plan = useMemo(() => parsePlan(content), [content]);

  const toggle = (line: number) => {
    const lines = content.split("\n");
    const m = TASK.exec(lines[line] ?? "");
    if (!m) return;
    lines[line] = `${m[1]}[${m[2] === " " ? "x" : " "}] ${m[3]}`;
    const next = lines.join("\n");
    setContent(next);
    change(next);
  };

  const pct = plan.total ? Math.round((plan.done / plan.total) * 100) : 0;

  return (
    <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[760px]">
        <header className="mb-5">
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight text-foreground">{plan.title || artifact.title}</h2>
          {plan.total > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-[999px] bg-highlight"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Actions completed"
              >
                <div className="h-full rounded-[999px] bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <span className="shrink-0 text-[12.5px] text-foreground/60">
                {plan.done} of {plan.total} actions done
              </span>
              <span role="status" className="flex shrink-0 items-center gap-1 text-[12px] text-foreground/60">
                {state === "saving" ? <Loader2 className="size-3 animate-spin" /> : state === "saved" ? <Check className="size-3 text-success" /> : null}
                {state === "failed" ? "Could not save" : ""}
              </span>
            </div>
          )}
        </header>

        <div className="space-y-3">
          {plan.sections.map((section, si) => (
            <section key={si} className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-5">
              {section.heading && (
                <h3 className="mb-2.5 flex items-center gap-2.5 text-[14.5px] font-semibold text-foreground">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-highlight text-[11px] font-medium text-highlight-foreground">{si + 1}</span>
                  {section.heading}
                </h3>
              )}
              <div className="space-y-1.5">
                {section.chunks.map((chunk, ci) =>
                  chunk.kind === "task" ? (
                    <label key={ci} className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-highlight/50">
                      <input type="checkbox" checked={chunk.done} onChange={() => toggle(chunk.line)} className="peer sr-only" />
                      <span
                        aria-hidden
                        className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
                          chunk.done ? "border-brand bg-brand text-brand-foreground" : "border-border"
                        }`}
                      >
                        {chunk.done && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className={`text-[14px] leading-snug ${chunk.done ? "text-foreground/50 line-through" : "text-foreground"}`}>{chunk.label}</span>
                    </label>
                  ) : (
                    <div key={ci} className="dot-prose text-[14px]">
                      <Markdown remarkPlugins={[remarkGfm]}>{chunk.text}</Markdown>
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
