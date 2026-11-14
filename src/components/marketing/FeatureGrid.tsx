"use client";

import type { MouseEvent, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, FileText, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import { marketingEase } from "@/lib/marketing-motion";
import { FocusText, Reveal } from "./Reveal";
import RailSection from "./RailSection";

function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const onMove = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };
  return (
    <article
      onMouseMove={onMove}
      className={`motion-card group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-brand/40 ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--brand) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </article>
  );
}

function CitationVisual({ reduce }: { reduce: boolean }) {
  const rows = [
    ["Notice.pdf", "Page 4"],
    ["Case file", "Page 12"],
  ] as const;
  return (
    <div className="mt-6 space-y-2" aria-hidden="true">
      {rows.map(([name, page], i) => (
        <motion.div
          key={name}
          initial={reduce ? false : { opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 0.2 + i * 0.15, ease: marketingEase }}
          className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-background px-3 py-2.5 text-[12px]"
        >
          <motion.span
            className="absolute inset-y-0 left-0 w-0.5 origin-top bg-brand"
            initial={reduce ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.5 + i * 0.15, ease: marketingEase }}
          />
          <FileText className="size-3.5 text-muted" strokeWidth={1.75} />
          <span className="flex-1 text-foreground">{name}</span>
          <span className="font-mono text-[10px] text-muted">{page}</span>
        </motion.div>
      ))}
    </div>
  );
}

function UncertaintyVisual({ reduce }: { reduce: boolean }) {
  return (
    <div
      className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-[12px] text-muted"
      aria-hidden="true"
    >
      <motion.span
        animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex"
      >
        <Search className="size-4" strokeWidth={1.75} />
      </motion.span>
      No supporting passage in the available record.
    </div>
  );
}

const features = [
  {
    icon: Search,
    title: "Answers you can verify",
    text: "Every response can show the file, page, and passage it came from.",
    visual: "citations",
    wide: true,
  },
  {
    icon: ShieldCheck,
    title: "Plain about uncertainty",
    text: "If the available material does not support an answer, Lirava says so.",
    visual: "uncertainty",
  },
  {
    icon: BookOpen,
    title: "Statute-accurate retrieval",
    text: "Find the exact section text, version, location, and source.",
  },
  {
    icon: LockKeyhole,
    title: "Shared and private libraries",
    text: "Firm resources and personal uploads remain clearly separated.",
  },
  {
    icon: FileText,
    title: "Research through drafting",
    text: "Move from facts and issues to a structured working draft.",
  },
  {
    icon: Sparkles,
    title: "Evidence and practice work",
    text: "Review material, identify issues, and keep matters organised.",
  },
] as const;

export default function FeatureGrid() {
  const reduce = Boolean(useReducedMotion());
  return (
    <RailSection className="bg-background">
      <div>
        <FocusText>
          <h2 className="max-w-2xl font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
            Useful at each stage of a matter.
          </h2>
        </FocusText>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={(i % 3) * 0.08} className={`${"wide" in feature ? "lg:col-span-2" : ""}`}>
                <SpotlightCard>
                  <Icon className="size-5 text-brand" />
                  <h3 className="mt-5">{feature.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{feature.text}</p>
                  {"visual" in feature && feature.visual === "citations" && <CitationVisual reduce={reduce} />}
                  {"visual" in feature && feature.visual === "uncertainty" && <UncertaintyVisual reduce={reduce} />}
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </RailSection>
  );
}
