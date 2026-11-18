"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ClipboardCheck, FileText, MessageSquare, Milestone, PenLine, Scale } from "lucide-react";
import type { Matter, MatterEvent, MatterStage } from "@/lib/types";
import { timeAgo } from "@/lib/status";

const STAGES: Array<{ id: MatterStage; label: string; note: string }> = [
  { id: "received", label: "Received", note: "Counsel has your brief" },
  { id: "reviewing", label: "Reviewing", note: "Reading papers, researching" },
  { id: "drafting", label: "Drafting", note: "Preparing documents" },
  { id: "review", label: "Your review", note: "Waiting for your approval" },
  { id: "closed", label: "Closed", note: "Matter wrapped up" },
];

const URGENCY_LABEL = { routine: "Routine", soon: "Soon", urgent: "Urgent" } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The case as a client would see it at a firm: where it stands, what needs them, and what has happened. */
export default function CaseFile({
  matter,
  events,
  chatHref,
  onAnswer,
}: {
  matter: Matter;
  events: MatterEvent[];
  chatHref: (conversationId: string) => string | null;
  onAnswer: (eventId: string, resolution: "approved" | "changes", note: string) => Promise<string | null>;
}) {
  const reduce = useReducedMotion();
  const stage: MatterStage = matter.stage ?? "received";
  const stageIndex = Math.max(0, STAGES.findIndex((s) => s.id === stage));
  // Only stages the case really passed through are filled; skipped ones stay empty.
  const reached = new Set<MatterStage>(events.filter((e) => e.type === "stage" && e.stage).map((e) => e.stage as MatterStage));
  reached.add("received");
  reached.add(stage);
  const open = events.filter((e) => e.type === "checkpoint" && e.status === "open");
  const deliverables = events.filter((e) => e.type === "deliverable");
  const timeline = [...events].reverse();
  const intake = matter.intake;
  const [briefOpen, setBriefOpen] = useState(false);

  // A matter that was never handed over and has no activity has no case file to show yet.
  if (!matter.handedOverAt && events.length === 0) return null;

  return (
    <div className="mt-10 space-y-10">
      {/* Where the case stands */}
      <section aria-label="Case progress">
        <ol className="grid grid-cols-5 gap-1" aria-label="Stages">
          {STAGES.map((item, index) => {
            const done = index < stageIndex && reached.has(item.id);
            const current = index === stageIndex;
            return (
              <li key={item.id} aria-current={current ? "step" : undefined} className="min-w-0">
                <div className="relative h-1 overflow-hidden rounded-[999px] bg-highlight">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-[999px] bg-brand"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: done || current ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease: EASE, delay: reduce ? 0 : index * 0.08 }}
                  />
                </div>
                <p className={`mt-2 truncate text-[12.5px] ${current ? "font-medium text-foreground" : done ? "text-foreground/75" : "text-foreground/50"}`}>{item.label}</p>
                <p className={`hidden truncate text-[11.5px] text-foreground/55 sm:block ${current ? "" : "invisible"}`}>{item.note}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Needs the person */}
      <AnimatePresence initial={false}>
        {open.length > 0 && (
          <motion.section
            key="needs-you"
            aria-label="Waiting for you"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <h2 className="flex items-center gap-2 font-serif text-2xl">
              <span className="live-dot size-2 rounded-[999px] bg-brand text-brand" aria-hidden="true" />
              Counsel needs your approval
            </h2>
            <div className="mt-4 space-y-3">
              {open.map((event) => (
                <Checkpoint key={event.id} event={event} chatHref={chatHref(event.conversationId ?? "")} onAnswer={onAnswer} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* The brief */}
      {intake && (
        <section aria-label="Case brief">
          <button type="button" onClick={() => setBriefOpen((value) => !value)} aria-expanded={briefOpen} className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-highlight">
            <span>
              <span className="block text-[14px] font-medium text-foreground">Your brief to counsel</span>
              <span className="block text-[12.5px] text-foreground/60">
                {[intake.caseType, URGENCY_LABEL[intake.urgency], matter.handedOverAt ? `handed over ${timeAgo(matter.handedOverAt)}` : ""].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="text-[12.5px] text-foreground/60">{briefOpen ? "Hide" : "Show"}</span>
          </button>
          <AnimatePresence initial={false}>
            {briefOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                <div className="space-y-4 px-4 pt-4 text-[14px] leading-relaxed text-foreground/85">
                  <p className="whitespace-pre-wrap">{intake.brief}</p>
                  {intake.oppositeParty && <p><span className="text-foreground/55">Against: </span>{intake.oppositeParty}</p>}
                  {intake.outcome && <p><span className="text-foreground/55">You want: </span>{intake.outcome}</p>}
                  {intake.keyDates.length > 0 && (
                    <ul className="space-y-1">
                      {intake.keyDates.map((d) => (
                        <li key={`${d.label}-${d.date}`}><span className="text-foreground/55">{formatDate(d.date)}</span> · {d.label}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Finished work */}
      <section aria-label="Case file">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Case file</h2>
          <span className="text-[12px] text-foreground/55">{deliverables.length} {deliverables.length === 1 ? "document" : "documents"} from counsel</span>
        </div>
        {deliverables.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-foreground/60">Memos, drafts and notices counsel prepares will be filed here.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {deliverables.map((event) => {
              const href = chatHref(event.conversationId ?? "");
              const inner = (
                <>
                  <FileText className="size-5 shrink-0 text-brand-readable" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-foreground">{event.title}</span>
                    <span className="block text-[12px] text-foreground/60">Filed {timeAgo(event.createdAt)}</span>
                  </span>
                </>
              );
              return (
                <li key={event.id}>
                  {href ? <Link href={href} className="surface motion-card flex items-center gap-3 p-4 transition-colors hover:border-brand/40">{inner}</Link> : <div className="surface flex items-center gap-3 p-4">{inner}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* What has happened */}
      <section aria-label="Timeline">
        <h2 className="font-serif text-2xl">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-foreground/60">Updates will appear here as counsel works on the case.</p>
        ) : (
          <ol className="relative mt-5 space-y-5 border-l border-border pl-6">
            {timeline.map((event, index) => (
              <TimelineItem key={event.id} event={event} href={chatHref(event.conversationId ?? "")} index={index} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

const ICONS = { stage: Milestone, note: PenLine, checkpoint: ClipboardCheck, deliverable: FileText } as const;

function TimelineItem({ event, href, index }: { event: MatterEvent; href: string | null; index: number }) {
  const reduce = useReducedMotion();
  const Icon = event.type === "stage" && event.stage === "received" ? Scale : ICONS[event.type];
  const waiting = event.type === "checkpoint" && event.status === "open";
  const resolved = event.type === "checkpoint" && event.status && event.status !== "open";
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: Math.min(index, 8) * 0.04 }}
      className="relative"
    >
      <span className={`absolute top-0.5 -left-[37px] flex size-6 items-center justify-center rounded-[999px] border bg-background ${waiting ? "border-brand text-brand-readable" : "border-border text-foreground/65"}`}>
        {resolved && event.status === "approved" ? <Check className="size-3.5" strokeWidth={2.5} /> : <Icon className="size-3.5" strokeWidth={1.75} />}
      </span>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p className="text-[14px] font-medium text-foreground">{event.title}</p>
        <time className="text-[12px] text-foreground/55" dateTime={new Date(event.createdAt).toISOString()} title={new Date(event.createdAt).toLocaleString()}>{timeAgo(event.createdAt)}</time>
        {waiting && <span className="rounded-[999px] bg-highlight px-2 text-[11.5px] leading-5 text-brand-readable">Waiting for you</span>}
        {resolved && <span className="rounded-[999px] bg-highlight px-2 text-[11.5px] leading-5 text-foreground/70">{event.status === "approved" ? "Approved" : "Changes requested"}</span>}
      </div>
      {event.body && <p className="mt-1 max-w-[70ch] text-[13.5px] leading-relaxed text-foreground/70">{event.body}</p>}
      {event.resolutionNote && <p className="mt-1 max-w-[70ch] text-[13px] italic text-foreground/60">“{event.resolutionNote}”</p>}
      {href && event.type !== "deliverable" && (
        <Link href={href} className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-brand-readable hover:underline">
          <MessageSquare className="size-3.5" strokeWidth={1.75} /> Open the chat
        </Link>
      )}
    </motion.li>
  );
}

function Checkpoint({ event, chatHref, onAnswer }: { event: MatterEvent; chatHref: string | null; onAnswer: (eventId: string, resolution: "approved" | "changes", note: string) => Promise<string | null> }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approved" | "changes" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (resolution: "approved" | "changes") => {
    if (resolution === "changes" && !note.trim()) return setError("Say what should change.");
    setBusy(resolution);
    setError(null);
    const failure = await onAnswer(event.id, resolution, note.trim());
    if (failure) {
      setError(failure);
      setBusy(null);
    }
  };

  return (
    <div className="surface border-brand/40 p-5">
      <p className="text-[15px] font-medium text-foreground">{event.title}</p>
      {event.body && <p className="mt-1 text-[13.5px] text-foreground/70">{event.body}</p>}
      {chatHref && (
        <Link href={chatHref} className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-brand-readable hover:underline">
          <MessageSquare className="size-3.5" strokeWidth={1.75} /> Read it in the chat
        </Link>
      )}
      <AnimatePresence initial={false}>
        {asking && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} className="overflow-hidden">
            <textarea className="field mt-3 min-h-[84px] w-full resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should counsel change or look at again?" aria-label="What should change" autoFocus />
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p role="alert" className="mt-2 text-[13px] text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!asking ? (
          <>
            <button type="button" onClick={() => void answer("approved")} disabled={busy !== null} className="btn-primary inline-flex h-9 items-center gap-2 px-4 text-[13px] disabled:opacity-60">
              <Check className="size-4" /> {busy === "approved" ? "Approving…" : "Approve"}
            </button>
            <button type="button" onClick={() => setAsking(true)} disabled={busy !== null} className="btn-secondary h-9 px-4 text-[13px]">Ask for changes</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => void answer("changes")} disabled={busy !== null} className="btn-primary h-9 px-4 text-[13px] disabled:opacity-60">{busy === "changes" ? "Sending…" : "Send to counsel"}</button>
            <button type="button" onClick={() => (setAsking(false), setError(null))} disabled={busy !== null} className="btn-quiet h-9 px-3 text-[13px]">Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
