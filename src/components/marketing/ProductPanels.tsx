"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, FileText, Lock, Search, Smartphone, Users } from "lucide-react";
import { marketingEase } from "@/lib/marketing-motion";
import { FocusText } from "./Reveal";
import RailSection from "./RailSection";

const MARK_STYLE = {
  backgroundImage:
    "linear-gradient(color-mix(in oklab, var(--brand) 32%, transparent), color-mix(in oklab, var(--brand) 32%, transparent))",
  backgroundRepeat: "no-repeat",
  WebkitBoxDecorationBreak: "clone",
  boxDecorationBreak: "clone",
} as const;

/** A lit, grainy panel that crops its contents at the edge, like a window onto a bigger app. */
function Panel({ children, flip = false }: { children: ReactNode; flip?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:min-h-[360px] sm:p-0 ${flip ? "lg:order-last" : ""}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: flip
            ? "radial-gradient(70% 60% at 100% 0%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 70%)"
            : "radial-gradient(70% 60% at 0% 0%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {children}
    </div>
  );
}

function Window({ tab, children, className = "" }: { tab: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-background shadow-elevated ${className}`}>
      <div className="flex items-center gap-2 border-b border-border bg-highlight px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-[999px] bg-border" />
          <span className="size-2 rounded-[999px] bg-border" />
          <span className="size-2 rounded-[999px] bg-border" />
        </span>
        <span className="rounded-md bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">{tab}</span>
      </div>
      {children}
    </div>
  );
}

function CitedAnswerVisual() {
  const reduce = Boolean(useReducedMotion());
  const rows = ["Notice.pdf, p. 4", "Case file, p. 12", "NI Act, 1881, s. 138"];
  const d = (n: number) => (reduce ? 0 : n);
  return (
    <div className="relative sm:absolute sm:top-10 sm:left-10 sm:w-[560px] sm:max-w-none" aria-hidden="true">
      <Window tab="Notice service">
        <div className="space-y-3 p-4">
          <div className="ml-auto w-fit max-w-[80%] rounded-xl rounded-br-sm bg-highlight px-3 py-2 text-[12px] text-foreground">
            Does the record support a challenge to service?
          </div>
          <p className="text-[11px] text-muted">Worked for 38s</p>
          <ul className="space-y-1.5">
            {rows.map((row, i) => (
              <motion.li
                key={row}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.48, delay: d(0.2 + i * 0.35), ease: marketingEase }}
                className="flex items-center gap-2 text-[12px]"
              >
                <FileText className="size-3.5 text-muted" strokeWidth={1.75} />
                <span className="font-semibold text-foreground">Read</span>
                <span className="font-mono text-[11px] text-muted">{row}</span>
              </motion.li>
            ))}
          </ul>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex justify-between font-mono text-[10px] text-muted">
              <span>Notice.pdf</span>
              <span>p. 4</span>
            </div>
            <p className="text-[12px] leading-[1.8] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
              Dispatched by registered post A.D. to the address recorded in the return memo;{" "}
              <motion.mark
                className="rounded-[2px] bg-transparent text-foreground"
                style={MARK_STYLE}
                initial={{ backgroundSize: "0% 100%" }}
                whileInView={{ backgroundSize: "100% 100%" }}
                viewport={{ once: true }}
                transition={{ duration: d(0.8), delay: d(1.4), ease: marketingEase }}
              >
                returned with the endorsement &lsquo;Unclaimed&rsquo; after two delivery intimations.
              </motion.mark>
            </p>
          </div>
          <p className="font-mono text-[11px] text-muted">4 sources cited · 2 statutes checked</p>
        </div>
      </Window>
    </div>
  );
}

function LibrariesVisual() {
  const reduce = Boolean(useReducedMotion());
  const d = (n: number) => (reduce ? 0 : n);
  const group = (icon: ReactNode, title: string, badge: string, rows: string[], delay: number) => (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
        {icon}
        {title}
        <span className="ml-auto rounded-[999px] border border-border px-2 py-0.5 text-[10px] font-normal text-muted">{badge}</span>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {rows.map((row, i) => (
          <motion.li
            key={row}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: d(delay + i * 0.2), ease: marketingEase }}
            className="flex items-center gap-2 text-[12px] text-muted"
          >
            <FileText className="size-3.5" strokeWidth={1.75} />
            {row}
          </motion.li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="relative sm:absolute sm:top-10 sm:left-10 sm:w-[440px] sm:max-w-none" aria-hidden="true">
      <Window tab="Libraries">
        <div className="space-y-3 p-4">
          {group(<Users className="size-3.5 text-brand" />, "Firm library", "Shared", ["Standard contract forms", "Practice notes", "Statute extracts"], 0.2)}
          {group(<Lock className="size-3.5 text-brand" />, "My uploads", "Private", ["Notice.pdf", "Case file", "Email chain.docx"], 0.9)}
        </div>
      </Window>
    </div>
  );
}

function PhoneVisual() {
  const reduce = Boolean(useReducedMotion());
  const d = (n: number) => (reduce ? 0 : n);
  return (
    <div className="relative mx-auto my-2 w-[250px] sm:absolute sm:top-10 sm:left-1/2 sm:my-0 sm:-translate-x-1/2" aria-hidden="true">
      <div className="overflow-hidden rounded-[28px] border border-border bg-background p-3 shadow-elevated" style={{ minHeight: 400 }}>
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-[999px] bg-border" />
        <div className="space-y-3 px-1">
          <div className="ml-auto w-fit max-w-[88%] rounded-xl rounded-br-sm bg-highlight px-3 py-2 text-[11.5px] text-foreground">
            Is the cure period over on the supply agreement?
          </div>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: d(0.5), ease: marketingEase }}
            className="text-[11.5px] leading-[1.65] text-foreground"
          >
            Not yet. Thirty days from the 20 February notice ends in late March.
            <span className="mx-0.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[5px] border border-brand/60 bg-highlight px-1 align-[1px] font-mono text-[9px] text-brand-readable">
              1
            </span>
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: d(1), ease: marketingEase }}
            className="rounded-lg border border-border bg-card px-2.5 py-2 text-[10.5px] text-muted"
          >
            <span className="font-mono">Email chain, p. 5</span>
            <p className="mt-1 text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
              Please cure within thirty days of this notice.
            </p>
          </motion.div>
          <p className="font-mono text-[10px] text-muted">Worked for 12s · 1 source cited</p>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-[11px] text-muted">
          <span className="flex-1">Ask a follow-up…</span>
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-action text-on-dark">
            <ArrowUp className="size-3" strokeWidth={2.25} />
          </span>
        </div>
      </div>
    </div>
  );
}

const panels = [
  {
    icon: Search,
    title: "Answers that show their working",
    text: "Every response lists the files and statutes it read, then points to the exact passage, so you can check it before you rely on it.",
    visual: <CitedAnswerVisual />,
  },
  {
    icon: Lock,
    title: "Shared and private, kept apart",
    text: "Firm resources and personal uploads sit in separate libraries. Your team decides what is shared; private uploads stay private.",
    visual: <LibrariesVisual />,
  },
  {
    icon: Smartphone,
    title: "Take the matter to court",
    text: "Lirava fits a phone screen, so you can check a clause or a date from the corridor and see the source behind it.",
    visual: <PhoneVisual />,
  },
] as const;

export default function ProductPanels() {
  return (
    <RailSection id="product" className="bg-background">
      <div>
        <FocusText>
          <h2 className="max-w-3xl font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
            Every answer, with its working.
          </h2>
        </FocusText>
        <div className="mt-14 space-y-16 sm:space-y-24">
          {panels.map((panel, i) => (
            <div key={panel.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <FocusText className={i % 2 === 1 ? "lg:order-first" : ""}>
                <panel.icon className="size-5 text-brand" aria-hidden="true" />
                <h3 className="mt-4">{panel.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">{panel.text}</p>
              </FocusText>
              <Panel flip={i % 2 === 1}>{panel.visual}</Panel>
            </div>
          ))}
        </div>
      </div>
    </RailSection>
  );
}
