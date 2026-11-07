"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { marketing } from "@/config/marketing";
import { revealTransition } from "@/lib/marketing-motion";

const features = [
  [
    Search,
    "Answers you can verify",
    "Every response can show the file, page, and passage it came from.",
  ],
  [
    ShieldCheck,
    "Plain about uncertainty",
    "If the available material does not support an answer, Lirava says so.",
  ],
  [
    BookOpen,
    "Statute-accurate retrieval",
    "Find the exact section text, version, location, and source.",
  ],
  [
    LockKeyhole,
    "Shared and private libraries",
    "Firm resources and personal uploads remain clearly separated.",
  ],
  [
    FileText,
    "Research through drafting",
    "Move from facts and issues to a structured working draft.",
  ],
  [
    Sparkles,
    "Evidence and practice work",
    "Review material, identify issues, and keep matters organised.",
  ],
] as const;

const questions = [
  [
    "How does Lirava handle accuracy?",
    "Lirava is designed to show the source material behind an answer. Lawyers can inspect the originating file, page, and passage before relying on it.",
  ],
  [
    "What happens when the material does not support an answer?",
    "Lirava should say that it cannot ground the answer in the available library instead of presenting an unsupported conclusion.",
  ],
  [
    "Who can see uploaded files?",
    "Private uploads are limited to their workspace. Shared material is managed separately for the firm library.",
  ],
  [
    "What Indian law is covered?",
    "The knowledge base is structured around Indian statutes with exact text and provenance. Case-law coverage is being expanded.",
  ],
  [
    "Does Lirava provide legal advice?",
    "No. Lirava assists legal professionals with research and legal work. A qualified lawyer remains responsible for analysis, advice, and filing decisions.",
  ],
] as const;

const demoScenarios = [
  {
    prompt: "Does the record support a Section 138 NI Act notice challenge based on service?",
    answer: "The available record does not establish non-service. Review the dispatch receipt and returned envelope before taking a final position.",
    sources: [
      ["Notice.pdf", "Page 4: Dispatch details and address."],
      ["Case file", "Page 12: Correspondence timeline."],
    ],
  },
  {
    prompt: "Which clause governs termination after a material breach?",
    answer: "Clause 14 requires written notice and a cure period before termination. The correspondence does not show that the cure period expired.",
    sources: [
      ["Supply agreement", "Page 18: Termination and cure."],
      ["Termination notice", "Page 2: Alleged material breach."],
    ],
  },
  {
    prompt: "What does the plaint say about the limitation period?",
    answer: "The pleading relies on acknowledgement in 2021. Confirm the signed communication before relying on a fresh limitation period.",
    sources: [
      ["Plaint.pdf", "Page 7: Limitation pleading."],
      ["Email chain", "Page 3: Acknowledgement of liability."],
    ],
  },
] as const;

type DemoStage = "typing" | "reading" | "answer";

function nextScenarioIndex(current: number) {
  return (current + 1 + Math.floor(Math.random() * (demoScenarios.length - 1))) % demoScenarios.length;
}

function Mark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-xl bg-navy text-[15px] font-serif font-semibold text-on-dark">
      L
    </span>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const navClass = "text-muted hover:text-foreground";
  return (
    <header
      className={`soli-nav sticky top-0 z-50 ${scrolled ? "soli-nav-scrolled" : "soli-nav-top"}`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Lirava home"
        >
          <Mark />
          <span
            className="font-serif text-[24px] font-semibold tracking-[-0.04em] text-foreground"
          >
            {marketing.name}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {marketing.navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setActive(item.href)}
              className={`relative text-[13px] font-medium transition-colors ${navClass}`}
            >
              {item.label}
              {active === item.href && (
                <motion.span
                  layoutId="soli-active-nav"
                  className="absolute -bottom-2 left-0 h-0.5 w-full bg-action"
                  transition={revealTransition}
                />
              )}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg border border-navy/20 px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-background/5"
          >
            Log in
          </Link>
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-navy/15 text-foreground lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-navy/10 bg-background px-4 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {marketing.navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-[14px] ${navClass}`}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg border border-navy/20 px-3 py-2.5 text-center text-[14px] font-semibold text-foreground"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function ProductPreview() {
  const reduceMotion = useReducedMotion();
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [stage, setStage] = useState<DemoStage>("answer");
  const [typedLength, setTypedLength] = useState(demoScenarios[0].prompt.length);
  const [paused, setPaused] = useState(false);
  const scenario = demoScenarios[scenarioIndex];
  const typedPrompt = scenario.prompt.slice(0, typedLength);

  useEffect(() => {
    if (reduceMotion || paused) return;

    if (stage === "typing") {
      if (typedLength < scenario.prompt.length) {
        const timer = window.setTimeout(() => setTypedLength((length) => length + 1), 22);
        return () => window.clearTimeout(timer);
      }
      setStage("reading");
      return;
    }

    const timer = window.setTimeout(() => {
      if (stage === "reading") {
        setStage("answer");
        return;
      }
      setScenarioIndex((index) => nextScenarioIndex(index));
      setTypedLength(0);
      setStage("typing");
    }, stage === "reading" ? 1100 : 3600);

    return () => window.clearTimeout(timer);
  }, [paused, reduceMotion, scenario.prompt.length, stage, typedLength]);

  return (
    <div
      className="relative mx-auto w-full rounded-lg border border-navy/15 bg-background p-3 shadow-elevated"
    >
      <div className="overflow-hidden rounded-md border border-navy/10 bg-card">
        <div className="flex items-center justify-between border-b border-navy/10 bg-highlight px-4 py-3">
          <span className="flex items-center text-[11px] font-medium text-foreground">
            Lirava workspace
          </span>
          <span className="rounded-full bg-background/7 px-2 py-1 text-[10px] font-medium text-foreground">
            Private matter
          </span>
        </div>
        <div className="relative grid min-h-[360px] gap-0 md:grid-cols-[1.35fr_0.65fr]" data-loop={!reduceMotion && !paused ? "running" : undefined}>
          <div className="soli-live-demo" data-stage={stage}>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-medium text-brand-readable">Ask a question</p>
                {!reduceMotion && (
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-highlight hover:text-foreground"
                    aria-label={paused ? "Play product demo" : "Pause product demo"}
                    aria-pressed={paused}
                  >
                    {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  </button>
                )}
              </div>
              <p className="mt-3 min-h-16 rounded-xl border border-navy/10 bg-background p-3 text-[13px] leading-relaxed text-foreground">
                {typedPrompt}
                {stage === "typing" && <span className="soli-demo-caret" aria-hidden="true" />}
              </p>
              <div className="mt-5 border-t border-navy/10 pt-5">
                <p className="text-[12px] font-medium text-brand-readable">
                  Lirava&apos;s answer
                </p>
                <div aria-live="polite">
                  {stage === "answer" ? (
                    <>
                      <p className="mt-2 text-[13px] leading-relaxed text-foreground">{scenario.answer}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {scenario.sources.map(([name, detail], index) => (
                          <span key={name} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${index === 0 ? "border-brand/25 bg-highlight text-brand-readable" : "border-navy/15 bg-background text-muted"}`}>
                            {name}, {detail.match(/Page \d+/)?.[0]}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">
                      {stage === "reading" ? "Reading the selected record and checking the cited passages…" : "Waiting for the question…"}
                    </p>
                  )}
                  <div className="mt-4 border-t border-border pt-3 md:hidden">
                    <p className="text-[10px] font-medium text-foreground">Sources</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-[10px] leading-relaxed text-muted">
                      {scenario.sources.map(([name, detail]) => <p key={name}><span className="block font-medium text-foreground">{name}</span>{detail}</p>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <aside className="border-t border-navy/10 bg-navy p-5 text-white md:border-t-0 md:border-l">
              <p className="text-[11px] font-medium text-on-dark">
                Sources
              </p>
              <div className="mt-4 space-y-3">
                {scenario.sources.map(([name, detail], index) => (
                  <div key={name} className={`rounded-xl border border-white/10 bg-white/8 p-3 ${index === 0 && stage !== "typing" ? "soli-source-active" : ""}`}>
                    <p className="text-[11px] font-semibold">{name}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-on-dark-muted">{detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[10px] leading-relaxed text-on-dark-muted">
                Sources stay visible with the answer.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatterDesk() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : { opacity: 0, y: 16 };
  const transition = (delay: number) => ({
    duration: reduceMotion ? 0 : 0.6,
    delay: reduceMotion ? 0 : delay,
    ease: "circOut" as const,
  });

  return (
    <div className="soli-desk-scene" aria-hidden="true">
      <motion.div
        className="soli-desk-sheet soli-desk-sheet--notice"
        initial={initial}
        animate={{ opacity: 1, y: 0, rotate: -5 }}
        transition={transition(0.08)}
      >
        <FileText className="size-5 text-brand" strokeWidth={1.75} />
        <p className="mt-7 text-[12px] font-semibold text-foreground">Notice.pdf</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">Dispatch receipt and address.</p>
        <span className="soli-desk-rule mt-6" />
      </motion.div>
      <motion.div
        className="soli-desk-sheet soli-desk-sheet--authority"
        initial={initial}
        animate={{ opacity: 1, y: 0, rotate: 4 }}
        transition={transition(0.18)}
      >
        <Search className="size-5 text-foreground" strokeWidth={1.75} />
        <p className="mt-7 text-[12px] font-semibold text-foreground">Section 138</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">Service and limitation.</p>
        <span className="mt-5 inline-flex rounded-md bg-brand px-2 py-1 text-[10px] font-semibold text-on-dark">Cited</span>
      </motion.div>
      <motion.div
        className="soli-desk-sheet soli-desk-sheet--draft"
        initial={initial}
        animate={{ opacity: 1, y: 0, rotate: -1 }}
        transition={transition(0.28)}
      >
        <Check className="size-5 text-brand" strokeWidth={1.75} />
        <p className="mt-8 text-[13px] font-semibold text-foreground">Draft ready</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">Authorities linked to the record.</p>
        <span className="soli-desk-rule mt-8" />
        <span className="soli-desk-rule mt-2 w-3/4" />
      </motion.div>
    </div>
  );
}

export default function MarketingSite() {
  return (
    <div className="soli-marketing min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="desk relative overflow-hidden text-foreground">
          <div className="soli-hero-layout relative mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-16 lg:pb-16">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <div className="max-w-2xl">
                <h1 className="soli-hero-title font-serif text-balance">
                  {marketing.tagline}
                </h1>
                <p className="mt-6 max-w-xl text-[17px] leading-[1.65] text-muted sm:text-[18px]">
                  From case files to court-ready drafts, Lirava keeps every answer grounded in your documents.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center rounded-lg bg-action px-6 text-[15px] font-semibold text-on-dark"
                  >
                    Open Lirava
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex h-12 items-center rounded-lg bg-card px-6 text-[15px] font-medium text-foreground shadow-elevated"
                  >
                    See how it works
                  </a>
                </div>
                <div aria-label="Supported files" className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
                  <span>PDF case files</span>
                  <span>DOCX drafts</span>
                  <span>Scanned judgments</span>
                </div>
              </div>
              <MatterDesk />
            </div>
            <div className="soli-hero-preview relative mx-auto mt-10 max-w-6xl sm:mt-14">
              <ProductPreview />
            </div>
          </div>
        </section>
        <section className="bg-background">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-navy/10 bg-background p-5 text-[16px] font-semibold text-foreground">
              <Check className="mb-4 size-6 text-brand" />
              <p>Built for Indian litigation</p>
              <span className="mt-1 block text-[14px] font-normal text-muted">
                Designed around legal work, not generic chat.
              </span>
            </div>
            <div className="rounded-2xl border border-navy/10 bg-card p-5 text-[16px] font-semibold text-foreground">
              <Search className="mb-4 size-6 text-brand" />
              <p>Every answer cited</p>
              <span className="mt-1 block text-[14px] font-normal text-muted">
                File, page, passage, and library context.
              </span>
            </div>
            <div className="rounded-2xl border border-navy/10 bg-background p-5 text-[16px] font-semibold text-foreground">
              <LockKeyhole className="mb-4 size-6 text-brand" />
              <p>Your files stay private</p>
              <span className="mt-1 block text-[14px] font-normal text-muted">
                Private material stays in the right workspace.
              </span>
            </div>
          </div>
        </section>
        <section className="bg-background py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
                Legal research should not begin with a blank search box.
              </h2>
            </div>
            <div className="space-y-5 text-[16px] leading-relaxed text-muted">
                <p>
                Litigation teams spend hours locating the right file, checking
                the exact provision, and rebuilding context before a draft can
                even begin.
              </p>
              <p>
                Generic AI can make that harder when it produces a confident
                answer without a source. Lirava keeps the underlying material in
                view, so the lawyer can verify the work.
              </p>
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="bg-background py-20 text-foreground sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="max-w-2xl font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
              From case file to cited answer.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                [
                  Upload,
                  "Upload case files",
                  "Add a matter bundle, selected documents, or a firm-approved resource.",
                ],
                [
                  Search,
                  "Ask in plain language",
                  "Ask about a notice, limitation issue, clause, or evidentiary point.",
                ],
                [
                  Check,
                  "Verify the answer",
                  "Review the filename, page, excerpt, and library context behind it.",
                ],
              ].map(([Icon, title, text]) => {
                const StepIcon = Icon as typeof Upload;
                return (
                  <article
                    key={title as string}
                    className="rounded-2xl border border-navy/10 bg-card p-6"
                  >
                    <StepIcon className="size-5 text-foreground" />
                    <h3 className="mt-4 text-[17px] font-semibold">
                      {title as string}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">
                      {text as string}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section id="product" className="bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
                Useful at each stage of a matter.
              </h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map(([Icon, title, text]) => (
                <article
                  key={title}
                  className="rounded-2xl border border-navy/10 bg-card p-6"
                >
                  <Icon className="size-5 text-brand" />
                  <h3 className="mt-5 text-[17px] font-semibold">{title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="knowledge" className="bg-navy py-20 text-on-dark sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <h2 className="font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
                Exact statute text, with a clear trail back to its source.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-on-dark-muted">
                Lirava structures statutes so a legal team can navigate from an
                Act to the relevant chapter, section, sub-section, proviso, or
                explanation.
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 p-5 sm:p-7">
              <div className="grid gap-2 text-[13px]">
                <div className="rounded-lg bg-white/8 px-3 py-2 text-on-dark-muted">
                  Indian Contract Act, 1872
                </div>
                <div className="ml-4 rounded-lg border-l border-on-dark/40 px-3 py-2 text-on-dark-muted">
                  Chapter VI: Of the consequences of breach
                </div>
                <div className="ml-8 rounded-lg bg-action px-3 py-2 font-semibold text-on-dark">
                  Section 73: Compensation for loss or damage caused by breach
                  of contract
                </div>
                <div className="ml-12 rounded-lg border-l border-white/15 px-3 py-2 text-on-dark-muted">
                  Text, version, and official source retained with the result
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-on-dark/20 bg-background p-4">
                <p className="text-[11px] font-medium text-foreground">
                  Section 73 example
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  When a contract has been broken, the party who suffers by such
                  breach is entitled to receive compensation for loss or damage
                  caused to it thereby…
                </p>
                <p className="mt-3 text-[11px] text-muted">
                  Source: Indian Contract Act, 1872, statutory text
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="security" className="bg-background py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <LockKeyhole className="size-6 text-brand" />
              <h2 className="mt-6 font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
                Legal work should remain within the right workspace.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-muted">
                Lirava separates a firm’s shared library from each lawyer’s
                private workspace. Your team decides what is shared; private
                uploads remain private.
              </p>
              <Link
                href="/security"
                className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-brand"
              >
                Read security details <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-navy/10 bg-card p-6">
                <h3 className="font-semibold">Private workspaces</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  Personal uploads are kept separate from colleagues’ work.
                </p>
              </div>
              <div className="rounded-2xl border border-navy/10 bg-highlight p-6">
                <h3 className="font-semibold">Firm controls</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  Approved firm material can be managed in a shared library.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="pricing"
          className="bg-background py-20 text-foreground sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-[38px] tracking-[-0.04em] sm:text-[52px]">
              Start with one practice group. Grow from there.
            </h2>
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {marketing.pricing.map((tier) => (
                <article
                  key={tier.name}
                  className="rounded-2xl border border-navy/10 bg-card p-6"
                >
                  <h3 className="text-[18px] font-semibold">{tier.name}</h3>
                  <p className="mt-2 text-[14px] text-muted">{tier.detail}</p>
                  <p className="mt-6 font-serif text-[34px] text-foreground">
                    {tier.price}
                  </p>
                  <p className="text-[11px] text-muted">
                    Per seat, volume and storage based
                  </p>
                  <ul className="mt-6 space-y-3">
                    {tier.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-[13px] text-muted"
                      >
                        <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`mailto:${marketing.contactEmail}`}
                    className="mt-7 inline-flex text-[14px] font-semibold text-brand"
                  >
                    Contact us <ArrowRight className="ml-2 size-4" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-serif text-[38px] tracking-[-0.04em] sm:text-[52px]">
              Questions worth asking.
            </h2>
            <div className="mt-10 divide-y divide-border border-y border-navy/10">
              {questions.map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                    <span>{question}</span>
                    <ChevronDown className="size-4 shrink-0 text-brand transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-navy text-on-dark-muted">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.6fr_repeat(3,1fr)] lg:px-8">
          <div>
            <p className="font-serif text-[32px] tracking-[-.04em] text-on-dark">
              Lirava
            </p>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed">
              A source-aware workspace for legal professionals.
            </p>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-on-dark">
              Product
            </p>
            <div className="mt-4 grid gap-2 text-[13px]">
              <a href="#product">Overview</a>
              <a href="#how-it-works">How it works</a>
              <a href="#pricing">Pricing</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-on-dark">
              Company
            </p>
            <div className="mt-4 grid gap-2 text-[13px]">
              <a href="#faq">FAQ</a>
              <a href={`mailto:${marketing.contactEmail}`}>Contact</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-on-dark">
              Legal
            </p>
            <div className="mt-4 grid gap-2 text-[13px]">
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-5 text-[12px] sm:px-6 lg:px-8">
            © 2026 Lirava. AI assistance for legal professionals; not legal
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
