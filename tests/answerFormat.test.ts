import assert from "node:assert/strict";
import test from "node:test";
import { certaintyOf, parseAnswerFormat, unconfirmedCitations } from "../src/lib/answerFormat";
import type { Citation, CiteVerdict } from "../src/lib/types";

const verdict = (over: Partial<CiteVerdict>): CiteVerdict => ({ raw: "2023 INSC 1043", span: [0, 14], kind: "neutral", status: "verified", reason: "ok", level: "citation", ...over });
const doc = (label: string): Citation => ({ kind: "document", label, fileId: "f", name: "FIR.pdf", page: 1, unit: "page", excerpt: "x" });

test("an answer in the format is split into its blocks", () => {
  const p = parseAnswerFormat(
    "Bottom line: The FIR was registered on 16 August 2025 [D1].\n\nThe informant is the wife of the deceased [D1].\n\nGaps: No charge-sheet is in the documents.\n\nNext move: Ask for the case diary.",
  );
  assert.equal(p.bottomLine, "The FIR was registered on 16 August 2025 [D1].");
  assert.equal(p.body, "The informant is the wife of the deceased [D1].");
  assert.equal(p.gaps, "No charge-sheet is in the documents.");
  assert.equal(p.nextMove, "Ask for the case diary.");
});

test("bold and heading spellings of the labels are read", () => {
  assert.equal(parseAnswerFormat("**Bottom line:** Yes.\n\nbody").bottomLine, "Yes.");
  assert.equal(parseAnswerFormat("**Bottom line**: Yes.\n\nbody").bottomLine, "Yes.");
  assert.equal(parseAnswerFormat("## Bottom line: Yes.\n\nbody").bottomLine, "Yes.");
  assert.equal(parseAnswerFormat("**Bottom line:** Yes.\n\nbody\n\n**Gaps:** Nothing on file.").gaps, "Nothing on file.");
  assert.equal(parseAnswerFormat("BOTTOM LINE: Yes.").bottomLine, "Yes.");
});

test("a message that does not start with a bottom line is shown exactly as written", () => {
  const text = "The FIR was registered on 16 August 2025.\n\nGaps: none.";
  const p = parseAnswerFormat(text);
  assert.equal(p.bottomLine, null);
  assert.equal(p.body, text);
  assert.equal(p.gaps, null, "Gaps are only lifted out of an answer that has a bottom line");
  assert.equal(parseAnswerFormat("Hello. How can I help?").bottomLine, null);
  assert.equal(parseAnswerFormat("").bottomLine, null);
});

test("an empty bottom line is not treated as one (the text may still be arriving)", () => {
  assert.equal(parseAnswerFormat("Bottom line:").bottomLine, null);
  assert.equal(parseAnswerFormat("Bottom line: Anticipatory").bottomLine, "Anticipatory");
});

test("a list under Gaps stays with Gaps, and the order of the last two blocks does not matter", () => {
  const p = parseAnswerFormat("Bottom line: Yes.\n\nbody\n\nGaps: Not on file:\n\n- charge-sheet\n- bail order\n\nNext move: File the application.");
  assert.equal(p.gaps, "Not on file:\n\n- charge-sheet\n- bail order");
  assert.equal(p.nextMove, "File the application.");
  const swapped = parseAnswerFormat("Bottom line: Yes.\n\nbody\n\nNext move: File it.\n\nGaps: No bail order is on file.");
  assert.equal(swapped.nextMove, "File it.");
  assert.equal(swapped.gaps, "No bail order is on file.");
  assert.equal(swapped.body, "body");
});

test("the body keeps its own paragraphs, tables and lists", () => {
  const body = "First point.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- one\n- two";
  assert.equal(parseAnswerFormat(`Bottom line: Yes.\n\n${body}\n\nGaps: none.`).body, body);
});

test("a bottom line with no body or blocks after it is still a bottom line", () => {
  const p = parseAnswerFormat("Bottom line: Yes, BNSS section 482 applies [S1].");
  assert.deepEqual(p, { bottomLine: "Yes, BNSS section 482 applies [S1].", body: "", gaps: null, nextMove: null });
});

// The real model often writes the blocks on consecutive lines with no blank line between them (live run, Q2 and Q5).
test("blocks written on consecutive lines, with no blank lines, are still split", () => {
  const live =
    "Bottom line: The punishment for murder under the Bharatiya Nyaya Sanhita, 2023 is death or imprisonment for life with fine [S1].\n" +
    "Under Section 103 BNS, whoever commits murder shall be punished with death or imprisonment for life [S1]. It replaced Section 302 IPC [S1].\n" +
    "Gaps: The sources do not say whether the accused was a minor.\n" +
    "Next move: Check the age proof.";
  const p = parseAnswerFormat(live);
  assert.equal(p.bottomLine, "The punishment for murder under the Bharatiya Nyaya Sanhita, 2023 is death or imprisonment for life with fine [S1].");
  assert.equal(p.body, "Under Section 103 BNS, whoever commits murder shall be punished with death or imprisonment for life [S1]. It replaced Section 302 IPC [S1].");
  assert.equal(p.gaps, "The sources do not say whether the accused was a minor.");
  assert.equal(p.nextMove, "Check the age proof.");
});

test("a Gaps or Next move that only says there is nothing is dropped, not shown as a reassurance", () => {
  const live = `Bottom line: Three years from when the money was lent [S1].
The period is three years [S1].
Gaps: none in the sources read.
Next move: None.`;
  const p = parseAnswerFormat(live);
  assert.equal(p.bottomLine, "Three years from when the money was lent [S1].");
  assert.equal(p.body, "The period is three years [S1].");
  assert.equal(p.gaps, null, "the model cannot be trusted to say nothing is missing");
  assert.equal(p.nextMove, null);
  for (const nothing of ["None.", "none", "N/A", "Nil", "Not applicable.", "No clear next step", "None found", "none in the sources read", "No gaps."]) {
    assert.equal(parseAnswerFormat(`Bottom line: Yes.
Gaps: ${nothing}`).gaps, null, nothing);
  }
  assert.equal(parseAnswerFormat(`Bottom line: Yes.
Gaps: None of the documents mention a charge-sheet.`).gaps, "None of the documents mention a charge-sheet.", "a real gap that starts with the word none is kept");
});

test("certainty comes from the citations and the checker, never from the model", () => {
  assert.deepEqual(certaintyOf(undefined, undefined), { tone: "none", label: "No sources", detail: "Not tied to your documents or the library" });

  const cited = certaintyOf([doc("D1"), doc("D1"), doc("D2")], undefined);
  assert.equal(cited.label, "Cites 2 sources");
  assert.equal(cited.tone, "plain");
  assert.equal(cited.detail, "Not checked against the library", "a source being attached is not a claim that it supports the point");
  assert.equal(certaintyOf([doc("D1")], undefined).label, "Cites 1 source");

  const found = certaintyOf([doc("S1")], [verdict({})]);
  assert.equal(found.label, "Citations found");
  assert.equal(found.tone, "ok");
  assert.equal(found.detail, "1 citation in the library · 1 source");

  const look = certaintyOf([doc("S1")], [verdict({}), verdict({ raw: "(2014) 8 SCC 273", status: "unverified", reason: "not_in_library" })]);
  assert.equal(look.tone, "look");
  assert.equal(look.label, "Check before relying", "one citation that needs a look outweighs the ones that were found");
  assert.match(look.detail, /^1 citation needs a look/);
});

test("a citation the library cannot check is not shown as found", () => {
  const c = certaintyOf([doc("S1")], [verdict({ status: "unverified", reason: "not_covered" })]);
  assert.equal(c.label, "Cites 1 source", "falls back to what is cited; nothing is claimed as checked");
});

test("gaps worked out from the checker list exactly the citations that need a look", () => {
  assert.deepEqual(unconfirmedCitations(undefined), []);
  assert.deepEqual(unconfirmedCitations([verdict({})]), [], "a found citation is not a gap");
  assert.deepEqual(unconfirmedCitations([verdict({ status: "unverified", reason: "not_covered" })]), [], "a citation the library cannot check either way is not reported as missing");
  const lines = unconfirmedCitations([verdict({}), verdict({ raw: "Section 41A of the Code of Criminal Procedure, 1973", kind: "statute", status: "unverified", reason: "not_in_library" })]);
  assert.deepEqual(lines, ["Section 41A of the Code of Criminal Procedure, 1973: not in the library"]);
});
