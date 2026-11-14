"use client";

import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type TraceRow = { id: string; label: string; detail: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> };

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

/**
 * What Lirava did to answer: while it works, steps appear one by one under a pulsing "Working…" label;
 * once the answer is in, the steps fold into a single "Worked for 38s" line that can be opened again.
 */
export function WorkTrace({ rows, live, seconds, queued = false }: { rows: TraceRow[]; live: boolean; seconds: number | null; queued?: boolean }) {
  const [open, setOpen] = useState(false);
  const expanded = live || open;

  return (
    <div className="animate-message-rise">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={live}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:hover:text-muted"
      >
        {live ? (
          <motion.span animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            {queued ? "Waiting for a free slot…" : "Working…"}
          </motion.span>
        ) : (
          <span>{seconds && seconds >= 1 ? `Worked for ${duration(seconds)}` : `Worked through ${rows.length} step${rows.length === 1 ? "" : "s"}`}</span>
        )}
        {!live && <ChevronDown className={`size-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
            aria-label="Steps"
          >
            {rows.map((row) => (
              <motion.li
                key={row.id}
                initial={live ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-w-0 items-center gap-2 py-1.5 text-[12.5px] first:mt-2"
              >
                <row.Icon className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="shrink-0 font-semibold text-foreground">{row.label}</span>
                {row.detail && <span className="min-w-0 truncate font-mono text-[12px] text-muted">{row.detail}</span>}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {live && <span className="live-dot mt-2 ml-0.5 block size-2 rounded-[2px] bg-brand text-brand" aria-hidden="true" />}
    </div>
  );
}
