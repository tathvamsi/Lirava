import assert from "node:assert/strict";
import test from "node:test";
import { CHECK_FOOTNOTE, DOCUMENT_LANGUAGES, describeVerdict, distinctVerdicts, summariseVerdicts, summaryLine, translationNames } from "../src/lib/citationCheck";
import type { CiteVerdict } from "../src/lib/types";

const verdict = (over: Partial<CiteVerdict>): CiteVerdict => ({ raw: "2023 INSC 1043", span: [0, 14], kind: "neutral", status: "verified", reason: "ok", level: "citation", ...over });

test("a verified citation says it is in the library, and never that the case supports the point", () => {
  const v = describeVerdict(verdict({ library_title: "Eldeco Housing v. Ashok Vidyarthi" }));
  assert.equal(v.tone, "ok");
  assert.equal(v.label, "In the library");
  assert.match(v.meaning, /Eldeco Housing v\. Ashok Vidyarthi/);
  assert.match(v.meaning, /does not confirm the point/);
  assert.match(CHECK_FOOTNOTE, /does not confirm that the case supports the point/);
});

test("a statute says the section was found, and a quote check says the words were found", () => {
  assert.equal(describeVerdict(verdict({ kind: "statute", raw: "Section 103 BNS", library_title: "Punishment for murder" })).label, "Section found");
  assert.equal(describeVerdict(verdict({ level: "quote" })).label, "Quote found");
});

test("every way a citation can be partly wrong is flagged for a look, with the checker's own warning when it gave one", () => {
  for (const reason of ["title_mismatch", "ambiguous", "quote_not_found", "para_out_of_range", "no_text"] as const) {
    const v = describeVerdict(verdict({ status: "partial", reason }));
    assert.equal(v.tone, "look", reason);
    assert.ok(v.meaning.length > 20, reason);
  }
  const warned = describeVerdict(verdict({ status: "partial", reason: "title_mismatch", warning: 'The citation belongs to "X v. Y", not "A v. B".' }));
  assert.match(warned.meaning, /belongs to "X v\. Y"/);
});

test("'not covered' is neutral and never implies the citation is false; 'not in the library' asks for a check", () => {
  const covered = describeVerdict(verdict({ status: "unverified", reason: "not_covered", raw: "(2014) 8 SCC 273", kind: "reporter" }));
  assert.equal(covered.tone, "none");
  assert.equal(covered.label, "Not covered");
  assert.doesNotMatch(covered.meaning, /fake|false|invalid|wrong|does not exist/i);
  const missing = describeVerdict(verdict({ status: "unverified", reason: "not_in_library" }));
  assert.equal(missing.tone, "look");
  assert.match(missing.meaning, /Check it before relying on it/);
});

test("every verdict has a written label, so no meaning rests on colour alone", () => {
  const all: Array<Pick<CiteVerdict, "status" | "reason">> = [
    { status: "verified", reason: "ok" },
    { status: "partial", reason: "title_mismatch" },
    { status: "partial", reason: "ambiguous" },
    { status: "partial", reason: "quote_not_found" },
    { status: "partial", reason: "para_out_of_range" },
    { status: "partial", reason: "no_text" },
    { status: "unverified", reason: "not_covered" },
    { status: "unverified", reason: "not_in_library" },
  ];
  for (const a of all) assert.ok(describeVerdict(verdict(a)).label.length >= 6, `${a.status}/${a.reason}`);
});

test("sections listed together are kept as separate rows, but an exact repeat is dropped", () => {
  const rows = distinctVerdicts([
    verdict({ kind: "statute", raw: "Sections 3(5) and 61 of BNS", library_title: "Common intention" }),
    verdict({ kind: "statute", raw: "Sections 3(5) and 61 of BNS", library_title: "Criminal conspiracy" }),
    verdict({ kind: "statute", raw: "Sections 3(5) and 61 of BNS", library_title: "Criminal conspiracy" }),
  ]);
  assert.equal(rows.length, 2);
});

test("the summary counts each kind and leaves out what is zero", () => {
  const s = summariseVerdicts([
    verdict({}),
    verdict({ raw: "a" }),
    verdict({ raw: "b", status: "unverified", reason: "not_in_library" }),
    verdict({ raw: "c", status: "unverified", reason: "not_covered" }),
    verdict({ raw: "d", status: "unverified", reason: "not_covered" }),
  ]);
  assert.deepEqual(s, { inLibrary: 2, needsLook: 1, notCovered: 2 });
  assert.equal(summaryLine(s), "2 in the library · 1 needs a look · 2 not covered");
  assert.equal(summaryLine({ inLibrary: 3, needsLook: 0, notCovered: 0 }), "3 in the library");
  assert.equal(summaryLine({ inLibrary: 0, needsLook: 2, notCovered: 0 }), "2 need a look");
});

test("translations are named in words, the five supported languages first, unknown codes dropped", () => {
  assert.deepEqual(translationNames(["MAL", "TEL", "HIN", "XYZ", "KAN"]), ["Hindi", "Kannada", "Telugu", "Malayalam"]);
  assert.deepEqual(translationNames(undefined), []);
  assert.deepEqual(translationNames([]), []);
});

test("the document-language list matches the API's six codes", () => {
  assert.deepEqual(DOCUMENT_LANGUAGES.map((l) => l.code), ["en", "hi", "kn", "ta", "te", "mr"]);
});
