/**
 * Question cards. The agent asks a clarifying question by writing one fenced `ask` block (JSON) in its answer.
 * This module pulls that block out of the text (also while it is still streaming in) and turns the user's
 * choices back into the plain message that is sent as the reply.
 */

export type ClarifyOption = { label: string; description?: string };
export type ClarifyQuestion = { header: string; question: string; options: ClarifyOption[]; multiSelect: boolean };

export const ANSWERS_PREFIX = "Here are my answers";
export const SKIP_ANSWER = `${ANSWERS_PREFIX}: please skip the questions, use sensible assumptions and tell me what you assumed.`;

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function normalize(raw: unknown): ClarifyQuestion[] | null {
  const list = (raw as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return null;
  const questions: ClarifyQuestion[] = [];
  for (const item of list.slice(0, 4)) {
    const q = item as Record<string, unknown>;
    const question = clip(q?.question, 300);
    const options = (Array.isArray(q?.options) ? q.options : [])
      .map((o) => {
        const opt = (typeof o === "string" ? { label: o } : o) as Record<string, unknown>;
        const label = clip(opt?.label, 80);
        const description = clip(opt?.description, 160);
        // The card has its own "Something else" row, so a model-written one would only repeat it.
        return label && !/^(other\b|something else|anything else|none of the above)/i.test(label) ? { label, ...(description ? { description } : {}) } : null;
      })
      .filter((o): o is ClarifyOption => o !== null)
      .slice(0, 4);
    if (!question || options.length < 2) continue;
    questions.push({ header: clip(q?.header, 24) || "Question", question, options, multiSelect: q?.multiSelect === true });
  }
  return questions.length ? questions : null;
}

/**
 * Splits an answer into its readable text and its question card (if any). `pending` is true while the block is
 * still being written, so the raw JSON is never shown and the UI can say the questions are on their way.
 */
export function parseClarify(text: string): { prose: string; questions: ClarifyQuestion[] | null; pending: boolean } {
  const closed = /```ask[^\S\n]*\n?([\s\S]*?)```/.exec(text);
  if (closed) {
    let questions: ClarifyQuestion[] | null = null;
    try {
      questions = normalize(JSON.parse(closed[1].trim()));
    } catch {
      questions = null;
    }
    const prose = (text.slice(0, closed.index) + text.slice(closed.index + closed[0].length)).trim();
    return { prose, questions, pending: false };
  }
  const open = text.indexOf("```ask");
  if (open !== -1) return { prose: text.slice(0, open).trim(), questions: null, pending: true };
  // The opening fence itself may be half-written at the end of the stream.
  const partial = /`{1,3}(a(s)?)?$/.exec(text);
  if (partial) return { prose: text.slice(0, partial.index).trimEnd(), questions: null, pending: false };
  return { prose: text, questions: null, pending: false };
}

/** The reply message for a set of chosen answers (one entry per question, in order). */
export function formatAnswers(questions: ClarifyQuestion[], answers: string[]): string {
  const lines = questions.map((q, i) => `${i + 1}. ${q.question} → ${answers[i]?.trim() || "No preference"}`);
  return `${ANSWERS_PREFIX}:\n${lines.join("\n")}`;
}

/** Reads the answers back out of a reply written by formatAnswers. */
export function parseAnswers(text: string): Array<{ question: string; answer: string }> {
  const out: Array<{ question: string; answer: string }> = [];
  for (const line of text.split("\n")) {
    const m = /^\d+\.\s+(.*?)\s→\s(.*)$/.exec(line.trim());
    if (m) out.push({ question: m[1], answer: m[2] });
  }
  return out;
}

export const isAnswersMessage = (text: string) => text.trimStart().startsWith(ANSWERS_PREFIX);
