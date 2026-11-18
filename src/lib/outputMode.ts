/**
 * Which kind of work a request asks for, so the chat can show "Writing your plan…" while the answer is still
 * being written instead of streaming a whole document into the chat. This mirrors classifyOutput in the API
 * (lirava-api/src/services/agent/output-mode.ts), which decides where the finished work is saved; keep the two
 * in step. If they ever disagree, the saved artifact is what counts and the text simply appears when it finishes.
 */
export type OutputMode = "document" | "plan";

const DOCUMENT_NOUN =
  /\b(legal notice|demand notice|notice|petition|plaint|written statement|affidavit|agreement|contract|deed|memorandum|memo of|application|vakalatnama|power of attorney|undertaking|settlement|complaint|appeal|revision|counter|reply|rejoinder|rebuttal|submissions?|arguments?|synopsis|brief|opinion|letter|draft)\b/i;
const PLAN_NOUN = /\b(plan|strategy|strategies|roadmap|game ?plan|checklist|timeline|action items?|approach|schedule|steps to|way forward|battle plan|case plan)\b/i;
const ASKS_FOR_WORK = /\b(draft|prepare|write|create|make|give me|build|put together|frame|compose|generate|need|want|help me (?:with|draft|write|prepare|plan)|plan|outline|map out|work out|suggest|come up with|set out)\b/i;
const QUESTION_START = /^\s*(what|why|how|when|who|which|is|are|can|does|do|should|explain|tell me|define)\b/i;

export function classifyOutput(request: string | null | undefined): OutputMode | null {
  const text = (request ?? "").trim();
  if (text.length < 8 || text.length > 1500) return null;
  if (!ASKS_FOR_WORK.test(text)) return null;
  if (QUESTION_START.test(text) && !/\b(draft|prepare|write|create|make|give me|plan)\b/i.test(text)) return null;
  const wantsPlan = PLAN_NOUN.test(text);
  const wantsDocument = DOCUMENT_NOUN.test(text);
  if (wantsPlan && wantsDocument) return text.search(PLAN_NOUN) <= text.search(DOCUMENT_NOUN) ? "plan" : "document";
  if (wantsPlan) return "plan";
  if (wantsDocument) return "document";
  return null;
}
