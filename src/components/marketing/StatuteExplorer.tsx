"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { marketingEase } from "@/lib/marketing-motion";
import { Reveal } from "./Reveal";
import RailSection from "./RailSection";

const nodes = [
  {
    id: "act",
    depth: 0,
    label: "Indian Contract Act, 1872",
    heading: "Start from the Act",
    body: "Navigate from an Act down to the chapter, section, sub-section, proviso, or explanation you need.",
    source: "Statutory text and version retained",
  },
  {
    id: "chapter",
    depth: 1,
    label: "Chapter VI: Of the consequences of breach",
    heading: "Keep the chapter context",
    body: "Related provisions stay grouped, so the context around a section travels with it.",
    source: "Source: Indian Contract Act, 1872",
  },
  {
    id: "section",
    depth: 2,
    label: "Section 73: Compensation for loss or damage caused by breach of contract",
    heading: "Section 73 example",
    body: "When a contract has been broken, the party who suffers by such breach is entitled to receive compensation for loss or damage caused to it thereby…",
    source: "Source: Indian Contract Act, 1872, statutory text",
  },
  {
    id: "source",
    depth: 3,
    label: "Text, version, and official source retained with the result",
    heading: "A trail back to the source",
    body: "Each result keeps the text, the version, and the official source it came from, so a citation can be checked.",
    source: "Text, version, and official source",
  },
] as const;

const indent = ["", "ml-4", "ml-8", "ml-12"] as const;

export default function StatuteExplorer() {
  const reduce = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<(typeof nodes)[number]["id"]>("section");
  const current = nodes.find((node) => node.id === selected) ?? nodes[2];

  return (
    <RailSection id="knowledge" className="bg-navy text-on-dark">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <h2 className="font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
            Exact statute text, with a clear trail back to its source.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-on-dark-muted">
            Lirava structures statutes so a legal team can navigate from an Act to the relevant chapter, section, sub-section,
            proviso, or explanation.
          </p>
          <p className="mt-4 text-[13px] text-on-dark-muted">Select a level to see what is kept at each step.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-white/12 bg-white/8 p-5 sm:p-7">
            <div className="grid gap-2 text-[13px]" role="group" aria-label="Statute structure">
              {nodes.map((node, i) => {
                const active = node.id === selected;
                return (
                  <motion.button
                    key={node.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(node.id)}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: reduce ? 0 : 0.15 + i * 0.1, ease: marketingEase }}
                    className={`relative rounded-lg px-3 py-2 text-left ${indent[node.depth]} ${
                      active ? "font-semibold text-on-dark" : "bg-white/8 text-on-dark-muted hover:bg-white/12"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="statute-active"
                        className="absolute inset-0 rounded-lg bg-action"
                        transition={{ duration: reduce ? 0 : 0.35, ease: marketingEase }}
                      />
                    )}
                    <span className="relative">{node.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <div className="mt-6 min-h-[150px] rounded-xl border border-on-dark/20 bg-background p-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: reduce ? 0 : 0.25, ease: marketingEase }}
                  aria-live="polite"
                >
                  <p className="text-[11px] font-medium text-foreground">{current.heading}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{current.body}</p>
                  <p className="mt-3 text-[11px] text-muted">{current.source}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </RailSection>
  );
}
