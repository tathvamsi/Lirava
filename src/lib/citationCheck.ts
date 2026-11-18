import type { CiteVerdict, DocumentLanguage } from "./types";

/**
 * Plain-words reading of the citation checker's verdicts, for the line shown under an answer.
 *
 * "In the library" means the citation matches a record the library holds. It never means the case supports the point
 * it is cited for, and the wording below keeps saying so.
 */

/** ok = matches a record; look = check it before relying on it; none = the library cannot say either way. */
export type Tone = "ok" | "look" | "none";
export type VerdictView = { tone: Tone; label: string; meaning: string };

export const CHECK_FOOTNOTE = "“In the library” means the citation matches a record we hold. It does not confirm that the case supports the point it is cited for.";

export function describeVerdict(v: CiteVerdict): VerdictView {
  const isStatute = v.kind === "statute";
  switch (v.status) {
    case "verified": {
      if (v.level === "quote") return { tone: "ok", label: "Quote found", meaning: "The quoted words appear in the judgment held by the library." };
      const what = v.library_title ? `“${v.library_title}”` : isStatute ? "a section we hold" : "a record we hold";
      return { tone: "ok", label: isStatute ? "Section found" : "In the library", meaning: `Matches ${what}. This does not confirm the point it is cited for.` };
    }
    case "partial": {
      const fallback: Record<string, VerdictView> = {
        title_mismatch: { tone: "look", label: "Name doesn’t match", meaning: "The citation is real, but it belongs to a different case than the name written beside it." },
        equivalence_mismatch: { tone: "look", label: "Not the same provision", meaning: "The text says this is the same provision as the section before it, but the two are different." },
        ambiguous: { tone: "look", label: "More than one match", meaning: "Two records share this citation, so it cannot be tied to a single case." },
        quote_not_found: { tone: "look", label: "Quote not found", meaning: "The case is in the library, but these words were not found in it." },
        para_out_of_range: { tone: "look", label: "Paragraph not found", meaning: "The case is in the library, but it has no such paragraph." },
        no_text: { tone: "look", label: "Quote not checked", meaning: "The case is in the library, but its text is not, so the quote could not be checked." },
      };
      const base = fallback[v.reason] ?? { tone: "look" as const, label: "Needs a look", meaning: "Part of this citation could not be confirmed." };
      return { ...base, meaning: v.warning ?? base.meaning };
    }
    case "unverified":
      if (v.reason === "not_covered") {
        return { tone: "none", label: "Not covered", meaning: v.warning ?? "The library does not hold this kind of citation yet, so it cannot say either way. Check it against the reporter." };
      }
      return { tone: "look", label: "Not in the library", meaning: v.warning ?? "The library covers this kind of citation and has no record of it. Check it before relying on it." };
  }
}

/** One row per distinct citation: sections listed together share one span, so the key includes the section's title. */
export function distinctVerdicts(verdicts: CiteVerdict[]): CiteVerdict[] {
  const seen = new Set<string>();
  return verdicts.filter((v) => {
    const key = `${v.raw}|${v.status}|${v.reason}|${v.library_title ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type CheckSummary = { inLibrary: number; needsLook: number; notCovered: number };

export function summariseVerdicts(verdicts: CiteVerdict[]): CheckSummary {
  const s: CheckSummary = { inLibrary: 0, needsLook: 0, notCovered: 0 };
  for (const v of verdicts) {
    const tone = describeVerdict(v).tone;
    if (tone === "ok") s.inLibrary++;
    else if (tone === "look") s.needsLook++;
    else s.notCovered++;
  }
  return s;
}

/** "3 in the library · 1 needs a look · 2 not covered": only the parts that are not zero. */
export function summaryLine(s: CheckSummary): string {
  const parts = [s.inLibrary && `${s.inLibrary} in the library`, s.needsLook && `${s.needsLook} need${s.needsLook === 1 ? "s" : ""} a look`, s.notCovered && `${s.notCovered} not covered`].filter(Boolean);
  return parts.join(" · ");
}

export const DOCUMENT_LANGUAGES: Array<{ code: DocumentLanguage; name: string; native: string }> = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
];

/** The Court's own language codes for the translations of a judgment, in words. */
const TRANSLATION_NAMES: Record<string, string> = { HIN: "Hindi", MAR: "Marathi", KAN: "Kannada", TAM: "Tamil", TEL: "Telugu", GUJ: "Gujarati", MAL: "Malayalam", ORI: "Odia", PUN: "Punjabi", NEP: "Nepali", BEN: "Bengali", ASM: "Assamese", URD: "Urdu" };

/** The five languages the product supports first, then any others; unknown codes are dropped rather than shown raw. */
export function translationNames(codes: string[] | undefined): string[] {
  if (!codes?.length) return [];
  const priority = ["HIN", "KAN", "TAM", "TEL", "MAR"];
  const known = codes.filter((c) => TRANSLATION_NAMES[c]);
  const ordered = [...priority.filter((c) => known.includes(c)), ...known.filter((c) => !priority.includes(c))];
  return ordered.map((c) => TRANSLATION_NAMES[c]);
}
