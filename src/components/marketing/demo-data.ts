/**
 * Illustrative content for the landing-page product demo.
 * The matters, dates and record passages are invented; statutory passages are quoted from the Acts.
 * Citation markers are written as "[n]" directly after punctuation and point at `sources[n - 1]`.
 */

export type DemoSource = {
  name: string;
  /** "p. 4" for record documents, "s. 138" for statutes. */
  locator: string;
  kind: "record" | "statute";
  before: string;
  hit: string;
  after: string;
};

export type Token = { t: "w"; text: string } | { t: "c"; n: number };

export type Block =
  | { kind: "h" | "p"; tokens: Token[] }
  | { kind: "ul"; items: Token[][] };

export type WorkStep = { verb: "Read" | "Check"; target: string };

export type DemoScenario = {
  label: string;
  /** Sidebar matter name. */
  matter: string;
  /** The steps shown while the assistant works, and how long the run took. */
  work: readonly WorkStep[];
  duration: string;
  prompt: string;
  files: readonly string[];
  library: readonly string[];
  sources: readonly DemoSource[];
  answer: readonly Block[];
};

export function parse(text: string): Token[] {
  const out: Token[] = [];
  for (const word of text.split(" ")) {
    const match = word.match(/^(.*?)((?:\[\d+\])+)$/);
    if (!match) {
      out.push({ t: "w", text: word });
      continue;
    }
    if (match[1]) out.push({ t: "w", text: match[1] });
    for (const cite of match[2].matchAll(/\[(\d+)\]/g)) out.push({ t: "c", n: Number(cite[1]) });
  }
  return out;
}

const h = (text: string): Block => ({ kind: "h", tokens: parse(text) });
const p = (text: string): Block => ({ kind: "p", tokens: parse(text) });
const ul = (...items: string[]): Block => ({ kind: "ul", items: items.map(parse) });

export function blockSize(block: Block): number {
  return block.kind === "ul" ? block.items.reduce((sum, item) => sum + item.length, 0) : block.tokens.length;
}

export function answerSize(scenario: DemoScenario): number {
  return scenario.answer.reduce((sum, block) => sum + blockSize(block), 0);
}

export const demoScenarios: readonly DemoScenario[] = [
  {
    label: "Notice service",
    matter: "Cheque dishonour complaint",
    duration: "38s",
    work: [
      { verb: "Read", target: "Notice.pdf, p. 4" },
      { verb: "Read", target: "Case file, p. 12" },
      { verb: "Read", target: "NI Act, 1881, s. 138" },
      { verb: "Read", target: "General Clauses Act, 1897, s. 27" },
      { verb: "Check", target: "4 citations" },
    ],
    prompt: "The drawer says the Section 138 notice was never served. Does the record support that challenge?",
    files: ["Notice.pdf", "Case file", "Cheque return memo.pdf", "Bank statement.pdf"],
    library: ["NI Act, 1881", "General Clauses Act, 1897"],
    sources: [
      {
        name: "Notice.pdf",
        locator: "p. 4",
        kind: "record",
        before: "Statutory notice under Section 138 issued to the drawer after the cheque was returned unpaid.",
        hit: "Dispatched by registered post A.D. on 12 March to the address recorded in the bank's return memo; postal receipt and tracking slip enclosed. Returned with the endorsement 'Unclaimed' after two delivery intimations.",
        after: "Copy of the notice and the postal receipt are annexed.",
      },
      {
        name: "Case file",
        locator: "p. 12",
        kind: "record",
        before: "Correspondence timeline.",
        hit: "28 Feb: cheque returned unpaid. 1 Mar: return memo received from the bank. 12 Mar: notice dispatched. 24 Apr: complaint filed.",
        after: "No reply to the notice appears in the file.",
      },
      {
        name: "NI Act, 1881",
        locator: "s. 138",
        kind: "statute",
        before: "Provided that nothing contained in this section shall apply unless— … the payee … makes a demand for the payment of the said amount of money by giving a notice in writing, to the drawer of the cheque,",
        hit: "within thirty days of the receipt of information by him from the bank regarding the return of the cheque as unpaid;",
        after: "and the drawer of such cheque fails to make the payment of the said amount of money … within fifteen days of the receipt of the said notice.",
      },
      {
        name: "General Clauses Act, 1897",
        locator: "s. 27",
        kind: "statute",
        before: "Meaning of service by post.— …",
        hit: "service shall be deemed to be effected by properly addressing, prepaying and posting by registered post, a letter containing the document, and, unless the contrary is proved, to have been effected at the time at which the letter would be delivered in the ordinary course of post.",
        after: "",
      },
    ],
    answer: [
      h("Short answer"),
      p(
        "On this record, a challenge based on non-service looks weak.[1][2] The notice went by registered post to the address in the bank's return memo and came back 'Unclaimed', which does not by itself show that it was never served.[1]",
      ),
      h("What the record shows"),
      ul(
        "Timing: the return memo reached the holder on 1 March and the notice went out on 12 March, inside the 30-day window.[2][3]",
        "Mode: registered post A.D. to the address recorded in the return memo, with the postal receipt and tracking slip enclosed.[1]",
        "Outcome: returned 'Unclaimed' after two delivery intimations.[1]",
      ),
      h("Legal position"),
      p(
        "Service by registered post to a properly addressed cover is presumed to be effected in the ordinary course of post unless the contrary is proved.[4] The Supreme Court has applied that presumption to Section 138 notices (C.C. Alavi Haji v. Palapetty Muhammed, (2007) 6 SCC 555), so the drawer would need to show that the address was wrong or that the intimation never reached them. The 15-day payment period runs from receipt of the notice, so the date of deemed receipt also fixes when the cause of action arose.[3]",
      ),
      h("Before you rely on this"),
      ul(
        "Check the returned envelope and tracking slip for the exact endorsement and dates.[1]",
        "Confirm that the address on the notice matches the cheque and the return memo.",
        "Pull and read the judgment cited above. It is not in the matter file.",
      ),
    ],
  },
  {
    label: "Termination clause",
    matter: "Supply agreement dispute",
    duration: "41s",
    work: [
      { verb: "Read", target: "Supply agreement, p. 18" },
      { verb: "Read", target: "Termination notice, p. 2" },
      { verb: "Read", target: "Email chain, p. 5" },
      { verb: "Read", target: "Indian Contract Act, 1872, s. 73" },
      { verb: "Check", target: "4 citations" },
    ],
    prompt: "Can the buyer rely on its 3 March notice to terminate immediately for the supplier's late deliveries?",
    files: ["Supply agreement", "Termination notice", "Email chain", "Delivery schedule.xlsx"],
    library: ["Indian Contract Act, 1872"],
    sources: [
      {
        name: "Supply agreement",
        locator: "p. 18",
        kind: "record",
        before: "14. Termination.",
        hit: "Either party may terminate this Agreement by written notice only if a material breach remains uncured thirty days after receipt of written notice of that breach.",
        after: "Termination does not affect rights accrued before the date of termination.",
      },
      {
        name: "Termination notice",
        locator: "p. 2",
        kind: "record",
        before: "Notice of termination dated 3 March.",
        hit: "The Supplier is in material breach of the delivery schedule. This notice is issued with immediate effect.",
        after: "Please return all unused materials within seven days.",
      },
      {
        name: "Email chain",
        locator: "p. 5",
        kind: "record",
        before: "Date: 20 February. Re: delivery schedule.",
        hit: "Formal notice of breach: units 40 to 60 were due on 15 February and remain undelivered. Please cure within thirty days of this notice.",
        after: "This notice is sent under clause 14 of the Agreement.",
      },
      {
        name: "Indian Contract Act, 1872",
        locator: "s. 73",
        kind: "statute",
        before: "Compensation for loss or damage caused by breach of contract.—",
        hit: "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.",
        after: "Such compensation is not to be given for any remote and indirect loss or damage sustained by reason of the breach.",
      },
    ],
    answer: [
      h("Short answer"),
      p(
        "Probably not. Clause 14 allows termination only if a material breach stays uncured thirty days after written notice,[1] and the 3 March notice was issued with immediate effect.[2]",
      ),
      h("What the record shows"),
      ul(
        "Clause 14 requires written notice of the breach and a thirty-day cure period before either party can terminate.[1]",
        "The only breach notice in the file is dated 20 February and asks for cure within thirty days, so the period ran into late March and had not expired on 3 March.[2][3]",
        "The termination notice neither says the breach is incurable nor relies on any other termination right.[2]",
      ),
      h("Consequences"),
      p(
        "If the termination was premature, the buyer risks being the party in breach. The supplier could then claim compensation for loss that naturally arose from the breach or was within the parties' contemplation, but not for remote or indirect loss.[4]",
      ),
      h("Next steps"),
      ul(
        "Check the rest of the agreement for any carve-out for incurable breaches or a time-of-the-essence term.",
        "Confirm whether, and when, the 20 February notice was received.[3]",
        "Consider serving a fresh notice once the cure period has lapsed.",
      ),
    ],
  },
  {
    label: "Limitation period",
    matter: "Recovery suit",
    duration: "44s",
    work: [
      { verb: "Read", target: "Plaint.pdf, p. 7" },
      { verb: "Read", target: "Email chain, p. 3" },
      { verb: "Read", target: "Ledger extract.pdf, p. 2" },
      { verb: "Read", target: "Limitation Act, 1963, s. 18(1)" },
      { verb: "Check", target: "4 citations" },
    ],
    prompt: "The plaint relies on a 2021 acknowledgement to save limitation. Does that hold up on the record?",
    files: ["Plaint.pdf", "Email chain", "Ledger extract.pdf", "Vakalatnama.pdf"],
    library: ["Limitation Act, 1963"],
    sources: [
      {
        name: "Plaint.pdf",
        locator: "p. 7",
        kind: "record",
        before: "Limitation.",
        hit: "The Defendant acknowledged the liability in writing on 14 June 2021, and limitation runs afresh from that date.",
        after: "The suit is therefore within time.",
      },
      {
        name: "Email chain",
        locator: "p. 3",
        kind: "record",
        before: "From: Accounts. Date: 14 June 2021. Re: outstanding invoices.",
        hit: "We confirm the outstanding balance on the invoices and will arrange payment shortly.",
        after: "Regards, Accounts Team.",
      },
      {
        name: "Ledger extract.pdf",
        locator: "p. 2",
        kind: "record",
        before: "Account statement, outstanding balance.",
        hit: "Last invoice dated 3 February 2019. Last payment received 20 March 2019.",
        after: "Closing balance carried forward.",
      },
      {
        name: "Limitation Act, 1963",
        locator: "s. 18(1)",
        kind: "statute",
        before: "Effect of acknowledgment in writing.—Where, before the expiration of the prescribed period for a suit or application in respect of any property or right,",
        hit: "an acknowledgment of liability in respect of such property or right has been made in writing signed by the party against whom such property or right is claimed, or by any person through whom he derives his title or liability, a fresh period of limitation shall be computed from the time when the acknowledgment was so signed.",
        after: "",
      },
    ],
    answer: [
      h("Short answer"),
      p(
        "It can hold up, but only if the 2021 email counts as an acknowledgement 'signed' by the Defendant under Section 18.[4] The record has the email but no signature.[2]",
      ),
      h("What the record shows"),
      ul(
        "The last invoice is dated 3 February 2019 and the last payment was received on 20 March 2019.[3]",
        "Assuming the usual three-year period for a money claim, time would have run out in early 2022, so an acknowledgement on 14 June 2021 falls inside the period.[1][3]",
        "The plaint pleads a written acknowledgement on 14 June 2021.[1] The only matching document is an email from the Defendant's accounts team confirming the balance.[2]",
      ),
      h("Legal position"),
      p(
        "Section 18 gives a fresh period only where the acknowledgement is in writing and signed by the party against whom the right is claimed, or by a person through whom they derive title or liability.[4] If the email qualifies, a fresh three-year period runs from 14 June 2021, so a suit filed by 14 June 2024 would be in time.",
      ),
      h("Gaps to close"),
      ul(
        "Whether the accounts team had authority to bind the Defendant.[2]",
        "Whether a typed name or email footer satisfies 'signed', and how courts in your forum have treated emails.",
        "Whether the invoices the email refers to match those in the ledger.[2][3]",
      ),
    ],
  },
  {
    label: "Award challenge",
    matter: "Arbitration challenge",
    duration: "47s",
    work: [
      { verb: "Read", target: "Courier receipt.pdf, p. 1" },
      { verb: "Read", target: "Section 34 petition.pdf, p. 1" },
      { verb: "Read", target: "Arbitration and Conciliation Act, 1996, s. 34(3)" },
      { verb: "Check", target: "3 citations" },
    ],
    prompt: "Is our application to set aside the arbitral award within time?",
    files: ["Arbitral award.pdf", "Courier receipt.pdf", "Section 34 petition.pdf"],
    library: ["Arbitration and Conciliation Act, 1996"],
    sources: [
      {
        name: "Courier receipt.pdf",
        locator: "p. 1",
        kind: "record",
        before: "Proof of delivery.",
        hit: "Signed copy of the arbitral award received at the registered office on 10 January.",
        after: "Received by: Office Manager.",
      },
      {
        name: "Section 34 petition.pdf",
        locator: "p. 1",
        kind: "record",
        before: "Filing details.",
        hit: "Petition under Section 34 filed in the High Court on 25 April.",
        after: "Registry diary number allotted.",
      },
      {
        name: "Arbitration and Conciliation Act, 1996",
        locator: "s. 34(3)",
        kind: "statute",
        before: "(3)",
        hit: "An application for setting aside may not be made after three months have elapsed from the date on which the party making that application had received the arbitral award",
        after: "or, if a request had been made under section 33, from the date on which that request had been disposed of by the arbitral tribunal: Provided that if the Court is satisfied that the applicant was prevented by sufficient cause from making the application within the said period of three months it may entertain the application within a further period of thirty days, but not thereafter.",
      },
    ],
    answer: [
      h("Short answer"),
      p(
        "Not within the three months, but only just outside them.[1][2] The petition can be entertained only if the Court is satisfied that there was sufficient cause for the delay, and only up to a further thirty days.[3]",
      ),
      h("What the record shows"),
      ul(
        "The award was received at the registered office on 10 January, so the three months ended on 10 April.[1]",
        "The petition was filed on 25 April, fifteen days after that date and inside the thirty-day window, which ends on 10 May.[2][3]",
        "Nothing in the file shows a request under section 33 that could have restarted the period.",
      ),
      h("Legal position"),
      p(
        "The proviso lets the Court entertain a petition filed within the further thirty days if the applicant was prevented by sufficient cause, and it says 'but not thereafter'.[3] The Supreme Court has held that section 5 of the Limitation Act cannot stretch that outer limit (Union of India v. Popular Construction Co., (2001) 8 SCC 470).",
      ),
      h("Before you rely on this"),
      ul(
        "Confirm the date of receipt. The period runs from when the party received the award, not from its date.[1]",
        "Prepare the explanation for the fifteen days between 10 April and 25 April.",
        "Pull and read the judgment cited above. It is not in the matter file.",
      ),
    ],
  },
  {
    label: "Reject the plaint",
    matter: "Property dispute",
    duration: "52s",
    work: [
      { verb: "Read", target: "Plaint.pdf, p. 5" },
      { verb: "Read", target: "Sale deed.pdf, p. 3" },
      { verb: "Read", target: "CPC, 1908, O. VII r. 11(d)" },
      { verb: "Read", target: "Limitation Act, 1963, s. 17(1)" },
      { verb: "Check", target: "4 citations" },
    ],
    prompt: "Can we get the plaint rejected at the threshold because the suit is time-barred?",
    files: ["Plaint.pdf", "Sale deed.pdf", "Mutation extract.pdf", "Written statement (draft)"],
    library: ["CPC, 1908", "Limitation Act, 1963"],
    sources: [
      {
        name: "Plaint.pdf",
        locator: "p. 5",
        kind: "record",
        before: "Cause of action and limitation.",
        hit: "The Plaintiff discovered the forged sale deed on 9 September 2022, when the mutation record was corrected, and files this suit on 18 November 2023.",
        after: "The suit is therefore within time.",
      },
      {
        name: "Sale deed.pdf",
        locator: "p. 3",
        kind: "record",
        before: "Sale deed.",
        hit: "Registered on 2 February 2020 before the Sub-Registrar.",
        after: "Execution witnessed by two witnesses.",
      },
      {
        name: "CPC, 1908",
        locator: "O. VII r. 11(d)",
        kind: "statute",
        before: "11. Rejection of plaint.—The plaint shall be rejected in the following cases:— …",
        hit: "where the suit appears from the statement in the plaint to be barred by any law;",
        after: "",
      },
      {
        name: "Limitation Act, 1963",
        locator: "s. 17(1)",
        kind: "statute",
        before: "Effect of fraud or mistake.—Where, in the case of any suit or application for which a period of limitation is prescribed by this Act, (a) the suit or application is based upon the fraud of the defendant or respondent or his agent; … ",
        hit: "the period of limitation shall not begin to run until the plaintiff or applicant has discovered the fraud or the mistake or could, with reasonable diligence, have discovered it;",
        after: "",
      },
    ],
    answer: [
      h("Short answer"),
      p(
        "Unlikely. On the face of the plaint the suit is not clearly barred, because it pleads fraud and a later date of discovery.[1][4]",
      ),
      h("What the record shows"),
      ul(
        "The sale deed was registered on 2 February 2020, so a plain three-year period counted from registration would have ended in February 2023.[2]",
        "The suit was filed on 18 November 2023, after that date, but the plaint pleads that the forgery was discovered on 9 September 2022.[1]",
        "Counted from that discovery date, the suit is within three years of filing.[1]",
      ),
      h("Legal position"),
      p(
        "Under Order VII Rule 11(d) the court looks at the statements in the plaint to see whether the suit is barred by law.[3] Where fraud is pleaded, time does not begin to run until the fraud is discovered, or could with reasonable diligence have been discovered.[4] Whether the Plaintiff could have found the forgery earlier is a question of fact, which usually has to be decided at trial rather than on a Rule 11 application.",
      ),
      h("Next steps"),
      ul(
        "Check whether the mutation record or other public documents gave earlier notice. Those points belong in the written statement.",
        "Consider asking for limitation to be tried as a preliminary issue instead of filing a Rule 11 application.",
        "Confirm the three-year period that applies to the relief claimed.",
      ),
    ],
  },
];
