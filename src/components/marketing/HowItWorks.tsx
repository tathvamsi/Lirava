"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { ArrowUp, Check, FileText, Lock, Search, Upload, Users } from "lucide-react";
import { marketingEase } from "@/lib/marketing-motion";
import { FocusText, useScrollerRef } from "./Reveal";
import RailSection from "./RailSection";

const checkpoints = [
  {
    icon: Upload,
    tag: "Intake",
    title: "Upload the bundle",
    text: "Add a matter bundle, selected documents, or a firm-approved resource.",
  },
  {
    icon: Search,
    tag: "Research",
    title: "Ask in plain language",
    text: "Ask about a notice, limitation issue, clause, or evidentiary point.",
  },
  {
    icon: Check,
    tag: "Evidence",
    title: "Verify every source",
    text: "Review the filename, page, excerpt, and library context behind each answer.",
  },
  {
    icon: FileText,
    tag: "Drafting",
    title: "Draft from the record",
    text: "Turn the checked facts and authorities into a structured working draft.",
  },
  {
    icon: Users,
    tag: "Firm",
    title: "Share what should be shared",
    text: "Keep private work private, and put approved material in the firm library.",
  },
] as const;

const MARK_STYLE = {
  backgroundImage:
    "linear-gradient(color-mix(in oklab, var(--brand) 32%, transparent), color-mix(in oklab, var(--brand) 32%, transparent))",
  backgroundRepeat: "no-repeat",
  WebkitBoxDecorationBreak: "clone",
  boxDecorationBreak: "clone",
} as const;

function useTyped(text: string, reduce: boolean, startDelay = 350) {
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let index = 0;
    let timer = 0;
    const tick = () => {
      index += 1;
      setLength(index);
      if (index < text.length) timer = window.setTimeout(tick, 26);
    };
    timer = window.setTimeout(tick, startDelay);
    return () => window.clearTimeout(timer);
  }, [text, reduce, startDelay]);
  return reduce ? text : text.slice(0, length);
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] text-muted">{label}</p>
      {children}
    </div>
  );
}

function UploadVisual({ reduce }: { reduce: boolean }) {
  const files = [
    ["Notice.pdf", "PDF"],
    ["Plaint.pdf", "PDF"],
    ["Email chain.docx", "DOCX"],
  ] as const;
  const d = (n: number) => (reduce ? 0 : n);
  return (
    <Frame label="Intake">
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-4 text-[13px] text-muted">
        <Upload className="size-4 text-brand" />
        Drop case files or a matter bundle
      </div>
      <ul className="mt-4 space-y-2.5">
        {files.map(([name, kind], i) => (
          <motion.li
            key={name}
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: d(0.4), delay: d(0.2 + i * 0.35), ease: marketingEase }}
            className="rounded-xl border border-border bg-background px-4 py-3"
          >
            <div className="flex items-center gap-3 text-[13px]">
              <FileText className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-foreground">{name}</span>
              <span className="font-mono text-[10px] text-muted">{kind}</span>
              <motion.span
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: d(0.2 + i * 0.35 + 1.2) }}
                className="inline-flex items-center gap-1 text-[11px] text-brand-readable"
              >
                <Check className="size-3" strokeWidth={2.5} /> Indexed
              </motion.span>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-[999px] bg-border">
              <motion.span
                className="block h-full origin-left rounded-[999px] bg-brand"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: d(1.1), delay: d(0.3 + i * 0.35), ease: marketingEase }}
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </Frame>
  );
}

function AskVisual({ reduce }: { reduce: boolean }) {
  const question = "Which clause governs termination after a material breach?";
  const typed = useTyped(question, reduce);
  const finishedTyping = typed.length === question.length;
  return (
    <Frame label="Research">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5">
        <p className="min-h-5 flex-1 text-[13.5px] leading-relaxed text-foreground">
          {typed}
          {!finishedTyping && <span className="soli-demo-caret" aria-hidden="true" />}
        </p>
        <motion.span
          animate={finishedTyping && !reduce ? { scale: [1, 1.12, 1] } : undefined}
          transition={{ duration: 0.5 }}
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md ${finishedTyping ? "bg-action text-on-dark" : "bg-highlight text-muted"}`}
          aria-hidden="true"
        >
          <ArrowUp className="size-4" strokeWidth={2.25} />
        </motion.span>
      </div>
      <p className="mt-4 text-[12px] text-muted">Lirava reads the selected matter before it answers.</p>
      <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
        {["A notice", "A limitation issue", "A clause", "An evidentiary point"].map((chip, i) => (
          <motion.span
            key={chip}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.6 + i * 0.1, duration: 0.35, ease: marketingEase }}
            className="rounded-[999px] border border-border px-3 py-1 text-[12px] text-muted"
          >
            {chip}
          </motion.span>
        ))}
      </div>
    </Frame>
  );
}

function VerifyVisual({ reduce }: { reduce: boolean }) {
  const d = (n: number) => (reduce ? 0 : n);
  return (
    <Frame label="Evidence">
      <div className="rounded-xl border border-border bg-background p-4 text-[13.5px] leading-relaxed text-foreground">
        Clause 14 requires written notice and a cure period before termination.
        <span className="ml-2 inline-flex items-center gap-1 rounded-[999px] border border-brand/50 bg-highlight px-2.5 py-0.5 align-middle text-[11px] font-medium text-brand-readable">
          <FileText className="size-3" strokeWidth={2} /> Supply agreement, p. 18
        </span>
      </div>
      <svg width="24" height="36" viewBox="0 0 24 36" className="ml-8" aria-hidden="true">
        <motion.line
          x1="2"
          y1="0"
          x2="2"
          y2="36"
          className="stroke-brand"
          strokeWidth="2"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: d(0.6), delay: d(0.3), ease: marketingEase }}
        />
      </svg>
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="mb-3 flex justify-between font-mono text-[10px] text-muted">
          <span>Supply agreement</span>
          <span>Page 18</span>
        </div>
        <p className="text-[13px] leading-[1.9] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
          14. Termination.{" "}
          <motion.mark
            className="rounded-[2px] bg-transparent text-foreground"
            style={MARK_STYLE}
            initial={{ backgroundSize: "0% 100%" }}
            animate={{ backgroundSize: "100% 100%" }}
            transition={{ duration: d(0.8), delay: d(0.8), ease: marketingEase }}
          >
            Either party may terminate by written notice only if a material breach remains uncured thirty days after receipt of
            notice.
          </motion.mark>
        </p>
      </div>
    </Frame>
  );
}

function DraftVisual({ reduce }: { reduce: boolean }) {
  const d = (n: number) => (reduce ? 0 : n);
  const paras: [string, string][] = [
    ["1.", "The statutory notice was dispatched by registered post on 12 March to the address recorded in the return memo."],
    ["2.", "The postal cover came back marked 'Unclaimed' after two delivery intimations."],
    ["3.", "Service is therefore presumed to have been effected in the ordinary course of post."],
  ];
  const cites = ["Notice.pdf, p. 4", "Case file, p. 12", "General Clauses Act, s. 27"];
  return (
    <Frame label="Drafting">
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="font-mono">Working draft</span>
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: d(1.9), duration: 0.35 }}
            className="rounded-[999px] bg-highlight px-2.5 py-0.5 text-[10px] text-brand-readable"
          >
            Draft ready
          </motion.span>
        </div>
        <p className="mt-4 text-center text-[12px] font-semibold tracking-[0.08em] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
          WRITTEN SUBMISSIONS
        </p>
        <div className="mt-4 space-y-3 text-[12.5px] leading-[1.8] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
          {paras.map(([n, text], i) => (
            <motion.p
              key={n}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: d(0.5), delay: d(0.3 + i * 0.5), ease: marketingEase }}
            >
              {n} {text}
              <sup className="ml-0.5 font-mono text-[9px] text-brand-readable">{i + 1}</sup>
            </motion.p>
          ))}
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: d(1.8) }}
          className="mt-4 border-t border-border pt-3 font-mono text-[10px] leading-relaxed text-muted"
        >
          {cites.map((c, i) => (
            <p key={c}>
              {i + 1} {c}
            </p>
          ))}
        </motion.div>
      </div>
    </Frame>
  );
}

function ShareVisual({ reduce }: { reduce: boolean }) {
  const d = (n: number) => (reduce ? 0 : n);
  const group = (icon: React.ReactNode, title: string, badge: string, rows: string[], delay: number) => (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        {icon}
        {title}
        <span className="ml-auto rounded-[999px] border border-border px-2.5 py-0.5 text-[10px] font-normal text-muted">{badge}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <motion.li
            key={row}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: d(0.45), delay: d(delay + i * 0.2), ease: marketingEase }}
            className="flex items-center gap-2 text-[12.5px] text-muted"
          >
            <FileText className="size-3.5" strokeWidth={1.75} />
            {row}
          </motion.li>
        ))}
      </ul>
    </div>
  );
  return (
    <Frame label="Firm">
      <div className="space-y-3">
        {group(<Users className="size-4 text-brand" />, "Firm library", "Shared", ["Standard contract forms", "Practice notes", "Statute extracts"], 0.2)}
        {group(<Lock className="size-4 text-brand" />, "My uploads", "Private", ["Notice.pdf", "Case file", "Email chain.docx"], 0.9)}
      </div>
    </Frame>
  );
}

function StepVisual({ step }: { step: number }) {
  const reduce = Boolean(useReducedMotion());
  if (step === 0) return <UploadVisual reduce={reduce} />;
  if (step === 1) return <AskVisual reduce={reduce} />;
  if (step === 2) return <VerifyVisual reduce={reduce} />;
  if (step === 3) return <DraftVisual reduce={reduce} />;
  return <ShareVisual reduce={reduce} />;
}

function StepStage({ step, animated = true }: { step: number; animated?: boolean }) {
  return (
    <div className="min-h-[380px] rounded-2xl border border-border bg-card p-5 shadow-elevated sm:p-6">
      {animated ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: marketingEase }}
          >
            <StepVisual step={step} />
          </motion.div>
        </AnimatePresence>
      ) : (
        <StepVisual step={step} />
      )}
    </div>
  );
}

/** A roadmap of checkpoints: the line fills as you scroll and the stage on the right follows the active checkpoint. */
export default function HowItWorks() {
  const reduce = Boolean(useReducedMotion());
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const container = useScrollerRef(listRef);
  const { scrollYProgress } = useScroll({ container, target: listRef, offset: ["start 0.55", "end 0.6"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });

  // The active checkpoint comes from the same progress that fills the line, so a fast scroll can never skip one.
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(Math.min(checkpoints.length - 1, Math.max(0, Math.floor(value * checkpoints.length))));
  });

  return (
    <RailSection id="how-it-works" className="bg-background">
      <div>
        <FocusText>
          <h2 className="max-w-3xl font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
            Your matter, checkpoint by checkpoint.
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
            From the first upload to a draft the whole firm can build on, every checkpoint keeps the record in view.
          </p>
        </FocusText>
        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <ol ref={listRef} className="relative">
            <span aria-hidden="true" className="absolute top-5 bottom-5 left-[15px] w-px bg-border" />
            <motion.span
              aria-hidden="true"
              style={{ scaleY: reduce ? 1 : fill, originY: 0 }}
              className="absolute top-5 bottom-5 left-[15px] w-px bg-brand"
            />
            {checkpoints.map((checkpoint, i) => {
              const Icon = checkpoint.icon;
              const reached = i <= active;
              return (
                <motion.li
                  key={checkpoint.title}
                  className="relative pb-10 lg:flex lg:min-h-[40vh] lg:items-center lg:pb-0"
                >
                  <div className="w-full pl-12">
                    <span
                      className={`absolute top-1 left-0 inline-flex size-8 items-center justify-center rounded-[999px] border transition-colors duration-300 lg:top-1/2 lg:-translate-y-1/2 ${
                        reached ? "border-brand bg-action text-on-dark" : "border-border bg-card text-muted"
                      }`}
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-current={active === i ? "step" : undefined}
                      className={`block w-full text-left transition-opacity ${active === i ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                    >
                      <span className="font-mono text-[11px] text-muted">
                        0{i + 1} · {checkpoint.tag}
                      </span>
                      <span className="mt-2 block text-[22px] font-semibold tracking-[-0.02em] text-foreground">{checkpoint.title}</span>
                      <span className="mt-2 block max-w-sm text-[14.5px] leading-relaxed text-muted">{checkpoint.text}</span>
                    </button>
                    <div className="mt-6 lg:hidden">
                      <StepStage step={i} animated={false} />
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-32">
              <StepStage step={active} />
            </div>
          </div>
        </div>
      </div>
    </RailSection>
  );
}
