import { describeVerdict, distinctVerdicts, summariseVerdicts } from "./citationCheck";
import type { Citation, CiteVerdict } from "./types";

/**
 * The parts of an answer that are shown as blocks: a "Bottom line" first, the body, then "Gaps" and a "Next move".
 *
 * The model writes them as plain labelled paragraphs ("Bottom line: …"), so a message that ignores the format is still readable
 * text and is simply shown as before. This reads those paragraphs; nothing here changes what was saved. The API's answer-format.ts
 * holds the matching instruction to the model; keep the two labels in step.
 */
export type AnswerParts = {
  /** The direct answer, or null when the message does not start with one (then nothing is lifted out and it is shown as written). */
  bottomLine: string | null;
  body: string;
  gaps: string | null;
  nextMove: string | null;
};

// "Bottom line:", "**Bottom line:**", "**Bottom line**:" or "## Bottom line:" at the start of a line.
const MARKER = /^\s*(?:#{1,6}\s+)?(?:\*\*|__)?(Bottom line|Gaps|Next move)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(.*)$/i;

type Label = "bottom" | "gaps" | "next";

function labelOf(line: string): { label: Label; rest: string } | null {
  const m = MARKER.exec(line);
  if (!m) return null;
  const name = m[1].toLowerCase();
  return { label: name === "bottom line" ? "bottom" : name === "gaps" ? "gaps" : "next", rest: m[2].trim() };
}

/** "None.", "N/A", "Nil", "No clear next step": the model saying it has nothing to add. That is silence, not a block. */
const NOTHING = /^(?:none|nil|n\/a|na|not applicable|no (?:clear |further )?(?:next )?(?:step|move|action|gaps?)s?(?: needed| required)?|none (?:found|identified|in the sources(?: read)?))\W*$/i;
const saysNothing = (text: string) => NOTHING.test(text.trim());

/**
 * Splits an answer into its blocks. A label starts a block when it begins a line, with or without a blank line before it: the
 * model often writes the blocks on consecutive lines. The bottom line is the first line. Safe on partial text, so it can be called
 * while the answer is still being written.
 *
 * A "Gaps" or "Next move" that only says there is nothing ("None.", "none in the sources read") is dropped. Whether the sources
 * left anything open is not something the model can be trusted to say, so no block is shown rather than a reassurance.
 */
export function parseAnswerFormat(text: string): AnswerParts {
  const none: AnswerParts = { bottomLine: null, body: text, gaps: null, nextMove: null };
  const lines = text.trim().split(/\r?\n/);
  const first = labelOf(lines[0] ?? "");
  if (!first || first.label !== "bottom" || !first.rest) return none;

  type Block = { label: Label; lines: string[] };
  const bodyLines: string[] = [];
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const line of lines.slice(1)) {
    const mark = labelOf(line);
    if (mark && mark.label !== "bottom") {
      current = { label: mark.label, lines: [mark.rest] };
      blocks.push(current);
    } else if (current) current.lines.push(line);
    else bodyLines.push(line);
  }

  const clean = (b: Block | undefined): string | null => {
    if (!b) return null;
    const joined = b.lines.join("\n").trim();
    return joined && !saysNothing(joined) ? joined : null;
  };
  const last = (label: Label) => blocks.filter((b) => b.label === label).at(-1);

  return {
    bottomLine: first.rest,
    body: bodyLines.join("\n").trim(),
    gaps: clean(last("gaps")),
    nextMove: clean(last("next")),
  };
}

/** ok = the checker matched citations to records we hold; look = something needs a look; plain = it cites sources and nothing was checked; none = no sources. */
export type Certainty = { tone: "ok" | "look" | "plain" | "none"; label: string; detail: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What the answer can be said to rest on, worked out from what it cites and what the citation checker found, never from what the
 * model says about itself. It never claims a point is right, and it never calls an answer "sourced": a source being attached does not
 * mean it supports the point (a section on condonation of delay was attached to an answer about limitation for money lent).
 */
export function certaintyOf(citations: Citation[] | null | undefined, verdicts: CiteVerdict[] | undefined): Certainty {
  const sources = new Set((citations ?? []).map((c) => c.label)).size;
  const summary = verdicts?.length ? summariseVerdicts(distinctVerdicts(verdicts)) : null;
  const sourceNote = sources ? plural(sources, "source", "sources") : "";

  if (summary && summary.needsLook > 0) {
    return { tone: "look", label: "Check before relying", detail: [`${plural(summary.needsLook, "citation needs", "citations need")} a look`, sourceNote].filter(Boolean).join(" · ") };
  }
  if (summary && summary.inLibrary > 0) {
    return { tone: "ok", label: "Citations found", detail: [`${plural(summary.inLibrary, "citation", "citations")} in the library`, sourceNote].filter(Boolean).join(" · ") };
  }
  if (sources > 0) return { tone: "plain", label: `Cites ${sourceNote}`, detail: "Not checked against the library" };
  return { tone: "none", label: "No sources", detail: "Not tied to your documents or the library" };
}

/**
 * What the citation checker could not confirm, in plain words, for the Gaps block. This is computed from the checker's findings,
 * so unlike the model's own "Gaps:" it can be relied on: it lists exactly the citations that need a look.
 */
export function unconfirmedCitations(verdicts: CiteVerdict[] | undefined): string[] {
  if (!verdicts?.length) return [];
  return distinctVerdicts(verdicts)
    .map((v) => ({ v, view: describeVerdict(v) }))
    .filter(({ view }) => view.tone === "look")
    .map(({ v, view }) => `${v.raw}: ${view.label.toLowerCase()}`);
}

/** Shown beside the badge so nobody reads it as a guarantee. */
export const CERTAINTY_NOTE = "This shows what the answer cites and whether the citations match a record we hold. It does not confirm that a point is right.";
