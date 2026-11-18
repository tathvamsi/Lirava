"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, MessageCircleQuestion } from "lucide-react";
import { SKIP_ANSWER, formatAnswers, parseAnswers, type ClarifyQuestion } from "@/lib/clarify";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The agent's questions, one at a time, answered with a click (or a number key) or in the user's own words.
 * Once the user has replied, the card folds into a quiet summary of what was asked and answered.
 */
export function ClarifyCard({
  questions,
  answeredText,
  disabled,
  onSubmit,
}: {
  questions: ClarifyQuestion[];
  /** The reply that followed this card, when there is one: the card is then read-only. */
  answeredText: string | null;
  disabled: boolean;
  onSubmit: (text: string) => void;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[][]>(() => questions.map(() => []));
  const [other, setOther] = useState<string[]>(() => questions.map(() => ""));
  const [otherOpen, setOtherOpen] = useState<boolean[]>(() => questions.map(() => false));
  const otherRef = useRef<HTMLInputElement>(null);

  const q = questions[step];
  const last = step === questions.length - 1;

  const answerFor = (i: number): string => {
    const parts = [...picked[i]];
    if (otherOpen[i] && other[i].trim()) parts.push(other[i].trim());
    return parts.join(", ");
  };
  const answered = (i: number) => answerFor(i).length > 0;

  const choose = (label: string) => {
    const multi = questions[step].multiSelect;
    setPicked((prev) => {
      const next = prev.map((p) => [...p]);
      const has = next[step].includes(label);
      next[step] = multi ? (has ? next[step].filter((l) => l !== label) : [...next[step], label]) : has ? [] : [label];
      return next;
    });
    if (!multi) setOtherOpen((prev) => prev.map((v, i) => (i === step ? false : v)));
  };

  const toggleOther = () => {
    const multi = questions[step].multiSelect;
    setOtherOpen((prev) => prev.map((v, i) => (i === step ? !v : v)));
    if (!multi) setPicked((prev) => prev.map((p, i) => (i === step ? [] : p)));
  };

  useEffect(() => {
    if (otherOpen[step]) otherRef.current?.focus();
  }, [otherOpen, step]);

  const next = () => {
    if (!answered(step) || disabled) return;
    if (last) onSubmit(formatAnswers(questions, questions.map((_, i) => answerFor(i))));
    else setStep(step + 1);
  };

  // Number keys pick an option; Enter moves on. Typing in the "something else" box is left alone.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (answeredText !== null || disabled) return;
    const tag = (e.target as HTMLElement).tagName;
    const typing = tag === "INPUT";
    if (!typing && /^[1-4]$/.test(e.key)) {
      const option = q.options[Number(e.key) - 1];
      if (option) {
        e.preventDefault();
        choose(option.label);
      }
    } else if (e.key === "Enter" && !e.shiftKey && (typing || tag !== "BUTTON")) {
      e.preventDefault();
      next();
    }
  };

  const summary = useMemo(() => (answeredText ? parseAnswers(answeredText) : []), [answeredText]);

  // ── Folded: the user has already replied ────────────────────────────────
  if (answeredText !== null) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-card/60 px-4 py-3" aria-label="Questions you answered">
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-foreground/70">
          <Check className="size-3.5 text-success" strokeWidth={2.25} />
          Answered
        </div>
        {summary.length > 0 ? (
          <dl className="mt-2 space-y-2">
            {summary.map((s, i) => (
              <div key={i}>
                <dt className="text-[12.5px] text-foreground/60">{s.question}</dt>
                <dd className="text-[14px] font-medium text-foreground">{s.answer}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1 text-[13px] text-foreground/60">You replied in your own words.</p>
        )}
      </div>
    );
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className="mt-3 overflow-hidden rounded-2xl border border-border bg-card"
      role="group"
      aria-label="Questions from Lirava"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircleQuestion className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
          <span className="truncate text-[12.5px] font-medium text-foreground/70">Lirava needs a little more</span>
        </div>
        {questions.length > 1 && (
          <ol className="flex items-center gap-1.5" aria-label={`Question ${step + 1} of ${questions.length}`}>
            {questions.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => (i <= step || answered(i - 1) ? setStep(i) : undefined)}
                  aria-label={`${item.header}${answered(i) ? " (answered)" : ""}`}
                  aria-current={i === step ? "step" : undefined}
                  className={`h-1.5 rounded-[999px] transition-all duration-300 ${i === step ? "w-6 bg-brand" : answered(i) ? "w-3 bg-brand/60" : "w-3 bg-highlight"}`}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -14 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="px-4 pb-3 pt-4"
        >
          <span className="inline-flex rounded-[999px] bg-highlight px-2 py-0.5 text-[11.5px] font-medium text-highlight-foreground">{q.header}</span>
          <p className="mt-2 text-[15.5px] font-medium leading-snug text-foreground">{q.question}</p>
          {q.multiSelect && <p className="mt-0.5 text-[12.5px] text-foreground/60">Choose any that apply.</p>}

          <div className="mt-3 space-y-2" role={q.multiSelect ? "group" : "radiogroup"} aria-label={q.question}>
            {q.options.map((option, oi) => {
              const on = picked[step].includes(option.label);
              return (
                <button
                  key={option.label}
                  type="button"
                  role={q.multiSelect ? "checkbox" : "radio"}
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => choose(option.label)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60 ${
                    on ? "border-brand bg-highlight" : "border-border hover:border-foreground/25 hover:bg-highlight/50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border text-[11px] font-medium transition-colors ${q.multiSelect ? "rounded-md" : "rounded-full"} ${
                      on ? "border-brand bg-brand text-brand-foreground" : "border-border text-foreground/60"
                    }`}
                  >
                    {on ? <Check className="size-3" strokeWidth={3} /> : oi + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium text-foreground">{option.label}</span>
                    {option.description && <span className="mt-0.5 block text-[13px] leading-snug text-foreground/60">{option.description}</span>}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              role={q.multiSelect ? "checkbox" : "radio"}
              aria-checked={otherOpen[step]}
              disabled={disabled}
              onClick={toggleOther}
              className={`flex w-full items-center gap-3 rounded-xl border border-dashed px-3.5 py-2.5 text-left text-[14.5px] transition-colors disabled:opacity-60 ${
                otherOpen[step] ? "border-brand bg-highlight text-foreground" : "border-border text-foreground/70 hover:border-foreground/25 hover:bg-highlight/50"
              }`}
            >
              <span className={`flex size-5 shrink-0 items-center justify-center border ${q.multiSelect ? "rounded-md" : "rounded-full"} ${otherOpen[step] ? "border-brand bg-brand text-brand-foreground" : "border-border"}`}>
                {otherOpen[step] && <Check className="size-3" strokeWidth={3} />}
              </span>
              Something else
            </button>
            <AnimatePresence initial={false}>
              {otherOpen[step] && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="overflow-hidden"
                >
                  <input
                    ref={otherRef}
                    value={other[step]}
                    onChange={(e) => setOther((prev) => prev.map((v, i) => (i === step ? e.target.value : v)))}
                    maxLength={300}
                    placeholder="Type your answer"
                    aria-label="Your own answer"
                    className="field mt-1 w-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
        <button type="button" disabled={disabled} onClick={() => onSubmit(SKIP_ANSWER)} className="text-[13px] text-foreground/60 transition-colors hover:text-foreground disabled:opacity-50">
          Skip, use your judgment
        </button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-quiet h-8 px-2.5 text-[13px]" aria-label="Previous question">
              <ArrowLeft className="size-3.5" />
            </button>
          )}
          <button type="button" onClick={next} disabled={disabled || !answered(step)} className="btn-primary h-8 gap-1.5 px-3.5 text-[13px] disabled:opacity-50">
            {last ? "Send answers" : "Next"}
            {last ? <CornerDownLeft className="size-3.5" /> : <ArrowRight className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
