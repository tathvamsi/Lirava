import assert from "node:assert/strict";
import test from "node:test";
import { cleanDocumentContent, detectLegalDocument } from "../src/lib/artifacts/detector";

const BODY_START = `IN THE COURT OF THE SESSIONS JUDGE, BENGALURU

APPLICATION FOR REGULAR BAIL UNDER SECTION 483 BNSS

Rajesh Kumar ... Applicant
VERSUS
State of Karnataka ... Respondent

MOST RESPECTFULLY SHOWETH:
`;

test("a Notes heading inside the petition does not cut off the rest of it", () => {
  const text = `${BODY_START}
## Notes on the chronology

1. The applicant was arrested on 3 October 2026 and has remained in custody since.
2. The charge sheet has not yet been filed although the investigation is complete.

## Grounds

1. The applicant has deep roots in the community and no risk of absconding.
2. The co-accused on identical allegations were granted bail on 12 November 2026.

## PRAYER

It is prayed that this Hon'ble Court may be pleased to release the applicant on bail.

Place: Bengaluru
Date: 4 December 2026
Advocate for the Applicant
`;
  const detected = detectLegalDocument(text);
  assert.ok(detected?.isLegalDoc);
  assert.match(detected.content, /Notes on the chronology/);
  assert.match(detected.content, /co-accused on identical allegations/, "grounds after the Notes heading are kept");
  assert.match(detected.content, /may be pleased to release the applicant on bail/, "the prayer is kept");
  assert.match(detected.content, /Advocate for the Applicant/, "the signature block is kept");
});

test("chat commentary after the document's ending is still removed", () => {
  const text = `Certainly! Here is the bail application you asked for:

${BODY_START}
1. The applicant has deep roots in the community and no risk of absconding.
2. The co-accused on identical allegations were granted bail.

PRAYER
It is prayed that this Hon'ble Court may be pleased to release the applicant on bail.

Place: Bengaluru
Date: 4 December 2026
Advocate for the Applicant

**Key Legal Points Included:**
- Section 483 BNSS is the regular bail provision.

Would you like me to adjust the grounds?
`;
  const cleaned = cleanDocumentContent(text);
  assert.doesNotMatch(cleaned, /Certainly/);
  assert.doesNotMatch(cleaned, /Key Legal Points/);
  assert.doesNotMatch(cleaned, /Would you like/);
  assert.match(cleaned, /PRAYER/);
  assert.match(cleaned, /Advocate for the Applicant/);
});

test("a draft with no recognisable ending only loses commentary from its final stretch", () => {
  const early = `${BODY_START}
Key Points of the case are set out below as part of the facts.

1. Fact one of the matter, described at some length so the draft is clearly a document.
2. Fact two of the matter, described at some length so the draft is clearly a document.
3. Fact three of the matter, described at some length so the draft is clearly a document.
4. Fact four of the matter, described at some length so the draft is clearly a document.
5. Fact five of the matter, described at some length so the draft is clearly a document.
6. Fact six of the matter, described at some length so the draft is clearly a document.
7. Fact seven of the matter, described at some length so the draft is clearly a document.
8. Fact eight of the matter, described at some length so the draft is clearly a document.

**Key Points:**
- Remember to attach the vakalatnama.
`;
  const cleaned = cleanDocumentContent(early);
  assert.match(cleaned, /Key Points of the case are set out below/, "an early mention stays");
  assert.match(cleaned, /Fact eight of the matter/);
  assert.doesNotMatch(cleaned, /attach the vakalatnama/, "the closing commentary goes");
});

test("a reply that only talks about petitions and agreements is not turned into a document", () => {
  const answer = `I'm Soli Master, your lead counsel. Here is what I'm good with:

- **Drafting:** petitions under Section 482, bail applications, a statutory demand notice under Section 138, and agreements with clauses on confidentiality and termination.
- **Research:** statutes and precedents, with sections and ratios.
- **Court practice:** grounds, prayer and verification for filings before the District and Sessions court.

Tell me the facts and the forum and I will prepare the draft.`;
  assert.equal(detectLegalDocument(answer), null);
});
