"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { marketingEase } from "@/lib/marketing-motion";

/** The nearest ancestor that actually scrolls (the app shell scrolls inside <main>, not the window). */
export function findScroller(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/**
 * Resolves the scroll container for `useScroll({ container })`.
 * Call it before `useScroll` in the same component so the ref is filled first.
 */
export function useScrollerRef(anchor: RefObject<HTMLElement | null>) {
  const scroller = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    scroller.current = findScroller(anchor.current);
  }, [anchor]);
  return scroller;
}

/** Fades and lifts content in once as it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: marketingEase }}
    >
      {children}
    </motion.div>
  );
}

function Word({
  children,
  progress,
  range,
  reduce,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  reduce: boolean;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <>
      <motion.span style={reduce ? undefined : { opacity }} className="inline-block">
        {children}
      </motion.span>{" "}
    </>
  );
}

/** A heading whose words light up as the reader scrolls past it. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const container = useScrollerRef(ref);
  const { scrollYProgress } = useScroll({ container, target: ref, offset: ["start 0.9", "end 0.5"] });
  const words = text.split(" ");
  return (
    <h2 ref={ref} className={className}>
      {words.map((word, i) => (
        <Word key={`${word}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} reduce={Boolean(reduce)}>
          {word}
        </Word>
      ))}
    </h2>
  );
}

/** Dims a block until it reaches reading position, then brings it to full brightness as you scroll. */
export function FocusText({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const container = useScrollerRef(ref);
  const { scrollYProgress } = useScroll({ container, target: ref, offset: ["start 0.98", "start 0.6"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.22, 1]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { opacity }}>
      {children}
    </motion.div>
  );
}
