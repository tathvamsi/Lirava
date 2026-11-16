"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { handOverCase, startConversation } from "@/app/actions";
import { useStore } from "@/lib/store";
import type { Attachment, MatterIntake } from "@/lib/types";

const CASE_TYPES = ["Civil suit", "Criminal", "Commercial / Arbitration", "Property", "Family", "Consumer", "Labour / Service", "Tax", "Writ / Constitutional", "Other"];
const URGENCY: Array<{ id: MatterIntake["urgency"]; label: string; hint: string }> = [
  { id: "routine", label: "Routine", hint: "No hearing in the next few weeks" },
  { id: "soon", label: "Soon", hint: "A date or filing is coming up" },
  { id: "urgent", label: "Urgent", hint: "Needs attention this week" },
];
const STEPS = ["The case", "What happened", "Dates", "Documents", "Hand over"] as const;

type FileUpload = { key: string; name: string; state: "uploading" | "done" | "error"; file?: Attachment; error?: string };
type DateRow = { id: number; label: string; date: string };

const formatDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * "Hand over a case": a short, guided briefing (the way a lawyer would take instructions) that creates the
 * matter, uploads the papers, and starts counsel on it. A live case note beside the form fills in as you answer.
 */
export default function HandoverWizard() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const vakil = useStore((s) => s.vakils[0]);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [caseType, setCaseType] = useState("");
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [oppositeParty, setOppositeParty] = useState("");
  const [court, setCourt] = useState("");
  const [brief, setBrief] = useState("");
  const [dates, setDates] = useState<DateRow[]>([{ id: 1, label: "", date: "" }]);
  const [urgency, setUrgency] = useState<MatterIntake["urgency"]>("routine");
  const [deadline, setDeadline] = useState("");
  const [outcome, setOutcome] = useState("");
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRow = useRef(2);
  const fileInput = useRef<HTMLInputElement>(null);

  const autoTitle = client.trim() && oppositeParty.trim() ? `${client.trim()} v. ${oppositeParty.trim()}` : "";
  const matterTitle = title.trim() || autoTitle;
  const uploading = uploads.some((u) => u.state === "uploading");
  const uploaded = uploads.filter((u) => u.state === "done").length;
  const filledDates = useMemo(() => dates.filter((d) => d.label.trim() && d.date), [dates]);

  const stepError = (index: number): string | null => {
    if (index === 0 && !matterTitle) return "Give the case a name, or fill in both parties.";
    if (index === 1 && brief.trim().length < 20) return "Tell counsel what happened, in a few sentences.";
    if (index === 3 && uploading) return "Wait for the documents to finish uploading.";
    return null;
  };

  const go = (to: number) => {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const problem = stepError(i);
        if (problem) return setError(problem);
      }
    }
    setError(null);
    setDirection(to >= step ? 1 : -1);
    setStep(to);
  };

  const addFiles = async (list: File[]) => {
    if (!list.length || !vakil) return;
    const batch = list.map((f) => ({ key: `${f.name}-${f.size}-${Math.random()}`, name: f.name, state: "uploading" as const }));
    setUploads((current) => [...current, ...batch]);
    const form = new FormData();
    for (const f of list) form.append("file", f);
    let files: Attachment[] | undefined;
    let failure = "Upload failed. Check your connection and try again.";
    try {
      const response = await fetch(`/api/vakils/${vakil.id}/files`, { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { files?: Attachment[]; error?: string };
      if (response.ok) files = data.files;
      else failure = data.error ?? "Upload failed";
    } catch {
      /* keep the default message */
    }
    setUploads((current) =>
      current.map((u) => {
        const index = batch.findIndex((b) => b.key === u.key);
        if (index < 0) return u;
        const file = files?.[index];
        return file ? { ...u, state: "done", file } : { ...u, state: "error", error: failure };
      }),
    );
  };

  const briefingMessage = () => {
    const urgencyLabel = URGENCY.find((u) => u.id === urgency)?.label;
    const parts = [
      "Please take on this case. This is my brief.",
      `Case: ${matterTitle}${caseType ? ` (${caseType})` : ""}`,
      court.trim() && `Court / forum: ${court.trim()}`,
      client.trim() && `My client: ${client.trim()}`,
      oppositeParty.trim() && `Opposite party: ${oppositeParty.trim()}`,
      `What happened:\n${brief.trim()}`,
      filledDates.length > 0 && `Key dates:\n${filledDates.map((d) => `- ${d.label.trim()}: ${formatDate(d.date)}`).join("\n")}`,
      outcome.trim() && `What I want from this: ${outcome.trim()}`,
      `Urgency: ${urgencyLabel}${deadline ? ` (next deadline ${formatDate(deadline)})` : ""}`,
      uploaded > 0
        ? "Start by going through the documents I've attached. Tell me the key facts, the legal issues, and what you would do first."
        : "Start by telling me the key facts as you understand them, the legal issues, and what you would do first.",
    ];
    return parts.filter(Boolean).join("\n\n");
  };

  const handOver = async () => {
    const problem = stepError(0) || stepError(1) || stepError(3);
    if (problem || !vakil) return setError(problem ?? "Counsel is still loading. Try again in a moment.");
    setSubmitting(true);
    setError(null);
    try {
      const matter = await handOverCase({
        title: matterTitle,
        client: client.trim(),
        court: court.trim(),
        intake: {
          brief: brief.trim(),
          caseType,
          oppositeParty: oppositeParty.trim(),
          keyDates: filledDates.map((d) => ({ label: d.label.trim(), date: d.date })),
          outcome: outcome.trim(),
          urgency,
          deadline,
        },
      });
      const attachments = uploads.filter((u) => u.state === "done" && u.file).map((u) => u.file!);
      // The case is handed over once the matter exists; the first briefing chat starts counsel on it.
      await startConversation(vakil.id, briefingMessage(), attachments, undefined, undefined, matter.id).catch(() => undefined);
      router.push(`/matters/${encodeURIComponent(matter.id)}?handed=1`);
    } catch {
      setError("We could not hand over the case. Nothing was lost. Please try again.");
      setSubmitting(false);
    }
  };

  const slide = reduce ? {} : { initial: { opacity: 0, x: direction * 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: direction * -28 } };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/matters" className="inline-flex items-center gap-2 text-[13px] text-foreground/60 transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> All matters
      </Link>
      <div className="mt-6 max-w-2xl">
        <p className="text-[13px] font-medium text-brand-readable">Hand over a case</p>
        <h1 className="mt-2 font-serif text-4xl tracking-[-0.04em] text-foreground sm:text-5xl">Brief your counsel.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/65">
          Tell Lirava about the case the way you would brief a junior advocate. Counsel reads your papers, researches, drafts, and checks back with you before anything moves forward.
        </p>
      </div>

      <ol className="mt-8 flex flex-wrap gap-x-2 gap-y-2" aria-label="Progress">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(index)}
                aria-current={current ? "step" : undefined}
                className={`flex h-8 items-center gap-2 rounded-[999px] border px-3 text-[12.5px] transition-colors ${current ? "border-brand/50 bg-highlight text-foreground" : "border-border text-foreground/65 hover:text-foreground"}`}
              >
                <span className={`flex size-4 items-center justify-center rounded-[999px] text-[10px] ${done ? "bg-brand text-background" : current ? "bg-brand/25 text-foreground" : "bg-highlight text-foreground/60"}`}>
                  {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                {label}
              </button>
              {index < STEPS.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface min-h-[420px] overflow-hidden p-5 sm:p-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} {...slide} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              {step === 0 && (
                <div className="space-y-6">
                  <Heading title="What kind of case is this?" hint="Counsel adjusts how it researches and drafts." />
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Case type">
                    {CASE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={caseType === type}
                        onClick={() => setCaseType(caseType === type ? "" : type)}
                        className={`h-9 rounded-[999px] border px-4 text-[13px] transition-colors ${caseType === type ? "border-brand/60 bg-highlight text-foreground" : "border-border text-foreground/70 hover:text-foreground"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your client"><input className="field" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Name of your client" autoComplete="off" /></Field>
                    <Field label="Opposite party"><input className="field" value={oppositeParty} onChange={(e) => setOppositeParty(e.target.value)} placeholder="Who is on the other side" autoComplete="off" /></Field>
                    <Field label="Court or forum"><input className="field" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="e.g. Delhi High Court, NCLT Mumbai" autoComplete="off" /></Field>
                    <Field label="Case name" hint={autoTitle && !title.trim() ? `Will be saved as “${autoTitle}”` : undefined}>
                      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle || "e.g. Sharma v. Kapoor Builders"} autoComplete="off" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <Heading title="What happened?" hint="Facts in the order they occurred. Rough notes are fine. Counsel will ask if something is unclear." />
                  <textarea
                    className="field min-h-[220px] w-full resize-y leading-relaxed"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="My client entered into an agreement on… The other side failed to… A legal notice was sent on…"
                    aria-label="What happened"
                  />
                  <p className="text-[12.5px] text-foreground/55">{brief.trim().length} characters. A few sentences is enough to begin.</p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <Heading title="Dates and urgency" hint="Limitation and hearing dates decide what counsel does first." />
                  <div className="space-y-2">
                    {dates.map((row) => (
                      <div key={row.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                        <input className="field" aria-label="What happened on this date" placeholder="e.g. Notice served, next hearing" value={row.label} onChange={(e) => setDates((c) => c.map((d) => (d.id === row.id ? { ...d, label: e.target.value } : d)))} />
                        <input className="field w-[160px]" type="date" aria-label="Date" value={row.date} onChange={(e) => setDates((c) => c.map((d) => (d.id === row.id ? { ...d, date: e.target.value } : d)))} />
                        <button type="button" onClick={() => setDates((c) => (c.length > 1 ? c.filter((d) => d.id !== row.id) : [{ ...row, label: "", date: "" }]))} className="flex size-9 items-center justify-center rounded-lg text-foreground/55 transition-colors hover:bg-highlight hover:text-foreground" aria-label="Remove date">
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setDates((c) => [...c, { id: nextRow.current++, label: "", date: "" }])} className="btn-quiet inline-flex h-9 items-center gap-2 px-2 text-[13px]">
                      <Plus className="size-4" /> Add a date
                    </button>
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-foreground/80">How urgent is it?</p>
                    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Urgency">
                      {URGENCY.map((option) => (
                        <button key={option.id} type="button" role="radio" aria-checked={urgency === option.id} onClick={() => setUrgency(option.id)} className={`rounded-xl border p-3 text-left transition-colors ${urgency === option.id ? "border-brand/60 bg-highlight" : "border-border hover:bg-highlight"}`}>
                          <span className="block text-[14px] font-medium text-foreground">{option.label}</span>
                          <span className="mt-0.5 block text-[12.5px] text-foreground/60">{option.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {urgency !== "routine" && (
                    <Field label="Next deadline"><input className="field w-[200px]" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <Heading title="Hand over the papers" hint="Notices, agreements, orders, pleadings. Counsel reads them page by page and cites the page." />
                  <div
                    onDragOver={(e) => (e.preventDefault(), setDragging(true))}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => (e.preventDefault(), setDragging(false), void addFiles(Array.from(e.dataTransfer.files)))}
                    className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-brand bg-highlight" : "border-border"}`}
                  >
                    <Upload className="size-6 text-brand-readable" strokeWidth={1.5} />
                    <p className="mt-3 text-[14px] text-foreground">Drop files here, or</p>
                    <button type="button" onClick={() => fileInput.current?.click()} disabled={!vakil} className="btn-secondary mt-3 h-9 px-4 text-[13px]">Choose files</button>
                    <input ref={fileInput} type="file" multiple className="sr-only" aria-label="Choose files" onChange={(e) => (void addFiles(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
                    <p className="mt-3 text-[12px] text-foreground/55">PDF, Word, images. You can add more later from any chat in the case.</p>
                  </div>
                  {uploads.length > 0 && (
                    <ul className="space-y-2">
                      {uploads.map((u) => (
                        <li key={u.key} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[13.5px]">
                          <FileText className="size-4 shrink-0 text-foreground/55" strokeWidth={1.75} />
                          <span className="min-w-0 flex-1 truncate">{u.name}</span>
                          {u.state === "uploading" && <Loader2 className="size-4 animate-spin text-foreground/55" aria-label="Uploading" />}
                          {u.state === "done" && <Check className="size-4 text-success" aria-label="Uploaded" />}
                          {u.state === "error" && <span className="text-[12px] text-destructive">{u.error}</span>}
                          <button type="button" onClick={() => setUploads((c) => c.filter((x) => x.key !== u.key))} className="text-foreground/55 hover:text-foreground" aria-label={`Remove ${u.name}`}><X className="size-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Field label="What outcome do you want?">
                    <textarea className="field min-h-[88px] w-full resize-y" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Recover the advance with interest, or settle before the next hearing." />
                  </Field>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <Heading title="Ready to hand over" hint="Here is what counsel will receive. Nothing is filed or sent to anyone." />
                  <dl className="divide-y divide-border rounded-xl border border-border text-[14px]">
                    <Row label="Case" value={`${matterTitle}${caseType ? ` · ${caseType}` : ""}`} />
                    <Row label="Parties" value={[client.trim(), oppositeParty.trim()].filter(Boolean).join(" against ") || "Not given"} />
                    <Row label="Forum" value={court.trim() || "Not given"} />
                    <Row label="Urgency" value={`${URGENCY.find((u) => u.id === urgency)?.label}${deadline ? ` · deadline ${formatDate(deadline)}` : ""}`} />
                    <Row label="Papers" value={`${uploaded} document${uploaded === 1 ? "" : "s"}`} />
                  </dl>
                  <div className="rounded-xl bg-highlight p-4 text-[13.5px] leading-relaxed text-foreground/80">
                    <p className="font-medium text-foreground">What happens next</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      <li>Counsel reads your brief and papers, and starts work straight away.</li>
                      <li>You see each stage on the case timeline, with short updates from counsel.</li>
                      <li>Counsel stops and asks you to approve findings and drafts before going further.</li>
                    </ol>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && <p role="alert" className="mt-5 text-[13px] text-destructive">{error}</p>}

          <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0 || submitting} className="btn-quiet inline-flex h-10 items-center gap-2 px-3 text-[13px] disabled:invisible">
              <ArrowLeft className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => go(step + 1)} className="btn-primary inline-flex h-10 items-center gap-2 px-5 text-[13px]">
                Continue <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" onClick={() => void handOver()} disabled={submitting || !vakil} className="btn-primary inline-flex h-10 items-center gap-2 px-5 text-[13px] disabled:opacity-60">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {submitting ? "Handing over…" : "Hand over the case"}
              </button>
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Case note">
          <div className="surface p-5">
            <p className="text-[12px] font-medium text-foreground/60">Case note</p>
            <h2 className="mt-2 font-serif text-xl leading-snug text-foreground">{matterTitle || "Untitled case"}</h2>
            <p className="mt-1 text-[13px] text-foreground/60">{[caseType, court.trim()].filter(Boolean).join(" · ") || "Type and forum not given yet"}</p>
            <div className="mt-4 space-y-3 border-t border-border pt-4 text-[13px]">
              <NoteLine label="Client" value={client.trim()} />
              <NoteLine label="Against" value={oppositeParty.trim()} />
              <NoteLine label="Facts" value={brief.trim().length > 180 ? `${brief.trim().slice(0, 180)}…` : brief.trim()} />
              <NoteLine label="Dates" value={filledDates.map((d) => `${d.label.trim()} ${formatDate(d.date)}`).join("; ")} />
              <NoteLine label="Wants" value={outcome.trim()} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      <p className="mt-1 text-[13.5px] text-foreground/60">{hint}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-foreground/55">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-24 shrink-0 text-foreground/60">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground">{value}</dd>
    </div>
  );
}

function NoteLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-3">
      <span className="w-14 shrink-0 text-foreground/55">{label}</span>
      <span className={`min-w-0 flex-1 break-words ${value ? "text-foreground/90" : "text-foreground/35"}`}>{value || "—"}</span>
    </p>
  );
}
