"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { marketingEase } from "@/lib/marketing-motion";

export default function Faq({ items }: { items: readonly (readonly [string, string])[] }) {
  const reduce = Boolean(useReducedMotion());
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map(([question, answer], i) => {
        const isOpen = open === i;
        return (
          <div key={question}>
            <button
              type="button"
              id={`${baseId}-q${i}`}
              aria-expanded={isOpen}
              aria-controls={`${baseId}-a${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-semibold text-foreground"
            >
              <span>{question}</span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.25, ease: marketingEase }}>
                <ChevronDown className="size-4 shrink-0 text-brand" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${baseId}-a${i}`}
                  role="region"
                  aria-labelledby={`${baseId}-q${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: marketingEase }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-5 text-[14px] leading-relaxed text-muted">{answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
