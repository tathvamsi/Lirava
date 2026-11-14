"use client";

import { Fragment, useEffect, useReducer, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowUp, ChevronDown, FileText, Folder, FolderOpen, Landmark, MessageSquare, Square, SquarePen, X } from "lucide-react";
import { LiravaMark } from "@/components/brand/LiravaLogo";
import { marketingEase } from "@/lib/marketing-motion";
import { answerSize, demoScenarios, type Block, type DemoScenario, type Token } from "./demo-data";

type Stage = "switching" | "typing" | "reading" | "answering" | "done";

type State = {
  scenario: number;
  stage: Stage;
  typed: number;
  step: number;
  words: number;
  source: number;
};

type Action =
  | { type: "begin" }
  | { type: "type" }
  | { type: "read" }
  | { type: "step" }
  | { type: "answer" }
  | { type: "word" }
  | { type: "done" }
  | { type: "next" }
  | { type: "select"; scenario: number; instant: boolean }
  | { type: "source"; source: number };

const finished = (scenario: number): State => ({
  scenario,
  stage: "done",
  typed: demoScenarios[scenario].prompt.length,
  step: demoScenarios[scenario].work.length,
  words: answerSize(demoScenarios[scenario]),
  source: 0,
});

const restarted = (scenario: number, stage: Stage = "switching"): State => ({
  scenario,
  stage,
  typed: 0,
  step: 0,
  words: 0,
  source: 0,
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "begin":
      return { ...state, stage: "typing" };
    case "type":
      return { ...state, typed: state.typed + 1 };
    case "read":
      return { ...state, stage: "reading", step: 0 };
    case "step":
      return { ...state, step: state.step + 1 };
    case "answer":
      return { ...state, stage: "answering", words: 0 };
    case "word":
      return { ...state, words: state.words + 1 };
    case "done":
      return { ...state, stage: "done", source: 0 };
    case "next":
      return restarted((state.scenario + 1) % demoScenarios.length);
    case "select":
      return action.instant ? finished(action.scenario) : restarted(action.scenario);
    case "source":
      return { ...state, source: action.source };
  }
}

export default function ProductDemo() {
  const reduce = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.2 });
  // The demo starts working on its own; reduced-motion visitors are moved straight to a finished state.
  const [state, dispatch] = useReducer(reducer, undefined, () => restarted(0, "typing"));
  const total = answerSize(demoScenarios[state.scenario]);
  const running = !reduce && inView;

  useEffect(() => {
    if (!reduce) return;
    const timer = window.setTimeout(() => dispatch({ type: "select", scenario: 0, instant: true }), 0);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  // Each stage schedules the next one.
  useEffect(() => {
    if (!running) return;
    const scenario = demoScenarios[state.scenario];
    let delay: number;
    let action: Action;
    switch (state.stage) {
      case "switching":
        delay = 480;
        action = { type: "begin" };
        break;
      case "typing":
        if (state.typed < scenario.prompt.length) {
          delay = state.typed === 0 ? 700 : 20;
          action = { type: "type" };
        } else {
          delay = 380;
          action = { type: "read" };
        }
        break;
      case "reading":
        if (state.step < scenario.work.length) {
          delay = 420;
          action = { type: "step" };
        } else {
          delay = 260;
          action = { type: "answer" };
        }
        break;
      case "answering":
        if (state.words < total) {
          delay = 24;
          action = { type: "word" };
        } else {
          delay = 320;
          action = { type: "done" };
        }
        break;
      default:
        delay = 9000;
        action = { type: "next" };
    }
    const timer = window.setTimeout(() => dispatch(action), delay);
    return () => window.clearTimeout(timer);
  }, [running, state, total]);

  const scenario = demoScenarios[state.scenario];
  const waiting = state.stage === "switching" || state.stage === "typing";

  return (
    <div ref={rootRef}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        {/* Title bar with the open chat as a tab */}
        <div className="flex items-center gap-3 border-b border-border bg-highlight px-4 py-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-[999px] bg-border" />
            <span className="size-2.5 rounded-[999px] bg-border" />
            <span className="size-2.5 rounded-[999px] bg-border" />
          </span>
          <span className="ml-2 inline-flex max-w-[60%] items-center gap-2 rounded-md bg-card px-3 py-1.5 text-[12px] font-medium text-foreground">
            <motion.span key={waiting ? "new" : scenario.label} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="truncate">
              {waiting ? "New chat" : scenario.label}
            </motion.span>
            <X className="size-3 shrink-0 text-muted" aria-hidden="true" />
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-[999px] border border-border px-2.5 py-0.5 text-[11px] text-muted sm:inline">Private matter</span>
          </span>
        </div>

        <div className="grid lg:h-[660px] lg:grid-cols-[236px_minmax(0,1fr)]">
          <Sidebar state={state} dispatch={dispatch} reduce={reduce} />

          {/* Outgoing and incoming chats share one grid cell so the window never collapses while they crossfade. */}
          <div className="grid min-w-0 lg:min-h-0">
            <AnimatePresence initial={false}>
              <motion.div
                key={state.scenario}
                className="min-w-0 [grid-area:1/1] lg:min-h-0"
                initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -24, filter: "blur(6px)", pointerEvents: "none" }}
                transition={{ duration: reduce ? 0 : 0.45, ease: marketingEase }}
              >
                <Chat state={state} dispatch={dispatch} reduce={reduce} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-muted">Illustrative example. Sources stay visible with every answer.</p>
    </div>
  );
}

type ViewProps = { state: State; dispatch: (action: Action) => void; reduce: boolean };

function Sidebar({ state, dispatch, reduce }: ViewProps) {
  const scenario = demoScenarios[state.scenario];
  const answered = state.stage === "answering" || state.stage === "done";
  const waiting = state.stage === "switching" || state.stage === "typing";

  const fileRow = (name: string, i: number, Icon: typeof FileText) => {
    const cited = answered && scenario.sources.some((s) => s.name === name);
    return (
      <div key={name} className={`relative flex items-center gap-2 overflow-hidden rounded-md py-1.5 pr-2 pl-3 text-[11.5px] ${cited ? "text-foreground" : "text-muted"}`}>
        {state.stage === "reading" && !reduce && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 origin-left bg-highlight"
            animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.7, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        )}
        <Icon className="relative size-3 shrink-0" strokeWidth={1.75} />
        <span className="relative min-w-0 flex-1 truncate">{name}</span>
        {cited && <span className="relative size-1.5 shrink-0 rounded-[999px] bg-brand" aria-label="Cited" />}
      </div>
    );
  };

  return (
    <aside className="hidden min-h-0 flex-col overflow-y-auto border-r border-border bg-background p-3 lg:flex" aria-label="Matters">
      <div className="flex items-center gap-2 px-2 pt-1 pb-3">
        <LiravaMark className="size-6" />
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Lirava</span>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-md px-2 py-2 text-[12.5px] text-foreground" aria-hidden="true">
        <SquarePen className="size-3.5" strokeWidth={1.75} />
        New chat
      </div>
      <p className="px-2 pb-1 text-[11px] font-medium text-muted">Matters</p>
      <div className="space-y-0.5">
        {demoScenarios.map((item, index) => {
          const active = index === state.scenario;
          return (
            <div key={item.matter}>
              <button
                type="button"
                onClick={() => dispatch({ type: "select", scenario: index, instant: reduce })}
                aria-pressed={active}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] ${active ? "text-foreground" : "text-muted hover:bg-highlight hover:text-foreground"}`}
              >
                {active ? <FolderOpen className="size-3.5 shrink-0" strokeWidth={1.75} /> : <Folder className="size-3.5 shrink-0" strokeWidth={1.75} />}
                <span className="min-w-0 flex-1 truncate">{item.matter}</span>
                <ChevronDown className={`size-3 shrink-0 transition-transform ${active ? "" : "-rotate-90"}`} />
              </button>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.3, ease: marketingEase }}
                    className="overflow-hidden"
                  >
                    <div className="mt-0.5 mb-2 ml-3 border-l border-border pl-1.5">
                      <div className="flex items-center gap-2 rounded-md bg-highlight py-1.5 pr-2 pl-2 text-[12px] text-foreground">
                        <MessageSquare className="size-3 shrink-0" strokeWidth={1.75} />
                        <motion.span key={waiting ? "new" : scenario.label} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1 truncate">
                          {waiting ? "New chat" : scenario.label}
                        </motion.span>
                      </div>
                      <p className="px-3 pt-2 pb-0.5 text-[10.5px] text-muted">Files</p>
                      {scenario.files.map((file, i) => fileRow(file, i, FileText))}
                      <p className="px-3 pt-2 pb-0.5 text-[10.5px] text-muted">Library</p>
                      {scenario.library.map((name, i) => fileRow(name, i + scenario.files.length, Landmark))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function Chat({ state, dispatch, reduce }: ViewProps) {
  const scenario = demoScenarios[state.scenario];
  const source = scenario.sources[state.source];
  const answered = state.stage === "answering" || state.stage === "done";
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest words in view while the answer streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && state.stage === "answering") el.scrollTop = el.scrollHeight;
  }, [state.stage, state.words]);

  return (
    <div className="grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      {/* Conversation */}
      <div className="flex min-h-[460px] min-w-0 flex-col lg:min-h-0">
        {/* Small screens have no sidebar, so matters are chosen here. */}
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2.5 lg:hidden" role="group" aria-label="Example matters">
          {demoScenarios.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={index === state.scenario}
              onClick={() => dispatch({ type: "select", scenario: index, instant: reduce })}
              className={`h-7 shrink-0 rounded-[999px] border px-3 text-[11.5px] ${index === state.scenario ? "border-brand/50 bg-highlight text-foreground" : "border-border text-muted"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-highlight px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
            {scenario.prompt.slice(0, state.typed)}
            {state.stage === "typing" && <span className="soli-demo-caret" aria-hidden="true" />}
          </div>

          <div className="flex gap-3">
            <LiravaMark className="mt-0.5 size-6 shrink-0" />
            <div className="min-w-0 flex-1" aria-live="polite" aria-busy={state.stage !== "done"}>
              {(state.stage === "switching" || state.stage === "typing") && <p className="text-[13px] text-muted">Ready when you are.</p>}

              {state.stage === "reading" && (
                <div aria-label="Progress">
                  <motion.p
                    className="text-[12.5px] text-muted"
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Working…
                  </motion.p>
                  <ul className="mt-3 space-y-2">
                    {scenario.work.slice(0, state.step).map((step) => (
                      <motion.li
                        key={`${step.verb}-${step.target}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.48, ease: marketingEase }}
                        className="flex items-center gap-2 text-[12.5px]"
                      >
                        <FileText className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                        <span className="font-semibold text-foreground">{step.verb}</span>
                        <span className="min-w-0 truncate font-mono text-[12px] text-muted">{step.target}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <span className="live-dot mt-3 ml-1 block size-2 rounded-[2px] bg-brand text-brand" aria-hidden="true" />
                </div>
              )}

              {answered && (
                <p className="mb-3 text-[12px] text-muted">{state.stage === "done" ? `Worked for ${scenario.duration}` : "Working…"}</p>
              )}

              {answered && (
                <Answer
                  scenario={scenario}
                  count={state.words}
                  streaming={state.stage === "answering"}
                  active={state.source}
                  onPick={(s) => dispatch({ type: "source", source: s })}
                />
              )}

              {state.stage === "done" && (
                <p className="mt-5 font-mono text-[11px] text-muted">
                  {scenario.sources.length} sources cited · {scenario.sources.filter((s) => s.kind === "statute").length} statutes checked
                </p>
              )}

              {state.stage === "done" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {scenario.sources.map((item, i) => (
                    <motion.button
                      key={item.name}
                      type="button"
                      aria-pressed={state.source === i}
                      onClick={() => dispatch({ type: "source", source: i })}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : i * 0.08, ease: marketingEase }}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-[999px] border px-3 text-[12px] font-medium ${
                        state.source === i
                          ? "border-brand/50 bg-highlight text-brand-readable"
                          : "border-border text-muted hover:border-brand/30 hover:text-foreground"
                      }`}
                    >
                      <span className="font-mono text-[10px]">{i + 1}</span>
                      {item.name}, {item.locator}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="mx-5 mb-5 rounded-xl border border-border bg-background p-3.5 sm:mx-6" aria-hidden="true">
          <p className="text-[13px] text-muted">Ask about this matter — / for commands, @ for files</p>
          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
              {scenario.matter}
              <ChevronDown className="size-3" />
            </span>
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-action text-on-dark">
              {state.stage === "reading" || state.stage === "answering" ? (
                <Square className="size-3 fill-current" strokeWidth={2.25} />
              ) : (
                <ArrowUp className="size-3.5" strokeWidth={2.25} />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Source viewer */}
      <div className="flex min-h-[320px] min-w-0 flex-col border-t border-border bg-background lg:min-h-0 lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-[11px] text-muted">
          <span>Source {state.source + 1}</span>
          <span className="truncate font-mono">
            {source.name} · {source.locator}
          </span>
        </div>
        <div className="relative flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={`${state.scenario}-${state.source}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: marketingEase }}
              className="rounded-lg border border-border bg-card p-5"
            >
              <SkeletonLines widths={["w-full", "w-11/12", "w-4/5"]} />
              <p className="mt-5 text-[13px] leading-[1.9] text-foreground [font-family:var(--font-dm-serif),Georgia,serif]">
                {source.before}{" "}
                <motion.mark
                  className="rounded-[2px] bg-transparent text-foreground"
                  style={{
                    backgroundImage:
                      "linear-gradient(color-mix(in oklab, var(--brand) 32%, transparent), color-mix(in oklab, var(--brand) 32%, transparent))",
                    backgroundRepeat: "no-repeat",
                    WebkitBoxDecorationBreak: "clone",
                    boxDecorationBreak: "clone",
                  }}
                  initial={{ backgroundSize: "0% 100%" }}
                  animate={{ backgroundSize: state.stage === "done" ? "100% 100%" : "0% 100%" }}
                  transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.2, ease: marketingEase }}
                >
                  {source.hit}
                </motion.mark>{" "}
                {source.after}
              </p>
              <div className="mt-5">
                <SkeletonLines widths={["w-full", "w-3/4"]} />
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Answer({
  scenario,
  count,
  streaming,
  active,
  onPick,
}: {
  scenario: DemoScenario;
  count: number;
  streaming: boolean;
  active: number;
  onPick: (source: number) => void;
}) {
  let remaining = count;
  const take = (size: number) => {
    const used = Math.min(remaining, size);
    remaining -= used;
    return used;
  };

  const cite = (token: Extract<Token, { t: "c" }>, key: number) => (
    <button
      key={key}
      type="button"
      onClick={() => onPick(token.n - 1)}
      aria-label={`Source ${token.n}: ${scenario.sources[token.n - 1]?.name}`}
      className={`mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border px-1 align-[1px] font-mono text-[10px] font-medium leading-none ${
        active === token.n - 1
          ? "border-brand/60 bg-highlight text-brand-readable"
          : "border-border text-muted hover:border-brand/40 hover:text-foreground"
      }`}
    >
      {token.n}
    </button>
  );

  // A word and the citation markers that follow it stay together so markers never wrap onto a line alone.
  const renderTokens = (tokens: Token[], used: number, caret: boolean) => {
    const shown = tokens.slice(0, used);
    const out: ReactNode[] = [];
    let i = 0;
    while (i < shown.length) {
      const token = shown[i];
      if (token.t === "c") {
        out.push(cite(token, i));
        i += 1;
        continue;
      }
      const markers: ReactNode[] = [];
      let j = i + 1;
      while (j < shown.length && shown[j].t === "c") {
        markers.push(cite(shown[j] as Extract<Token, { t: "c" }>, j));
        j += 1;
      }
      out.push(
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="whitespace-nowrap">
            {token.text}
            {markers}
          </span>
        </Fragment>,
      );
      i = j;
    }
    return (
      <>
        {out}
        {caret && <span className="soli-demo-caret" aria-hidden="true" />}
      </>
    );
  };

  const nodes: ReactNode[] = [];
  scenario.answer.forEach((block: Block, index) => {
    if (remaining <= 0) return;
    if (block.kind === "ul") {
      const items: ReactNode[] = [];
      block.items.forEach((item, j) => {
        if (remaining <= 0) return;
        const used = take(item.length);
        items.push(<li key={j}>{renderTokens(item, used, streaming && remaining <= 0)}</li>);
      });
      nodes.push(
        <ul key={index} className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] leading-[1.7] text-foreground marker:text-muted">
          {items}
        </ul>,
      );
      return;
    }
    const used = take(block.tokens.length);
    const caret = streaming && remaining <= 0;
    if (block.kind === "h") {
      nodes.push(
        <p key={index} className="mt-5 text-[13px] font-semibold text-foreground first:mt-0">
          {renderTokens(block.tokens, used, caret)}
        </p>,
      );
    } else {
      nodes.push(
        <p key={index} className="mt-2 text-[13.5px] leading-[1.7] text-foreground">
          {renderTokens(block.tokens, used, caret)}
        </p>,
      );
    }
  });
  return <div>{nodes}</div>;
}

function SkeletonLines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {widths.map((width, i) => (
        <span key={i} className={`block h-1.5 rounded-[3px] bg-border ${width}`} />
      ))}
    </div>
  );
}
