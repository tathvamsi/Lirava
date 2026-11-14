"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Check, LockKeyhole, Menu, Search, X } from "lucide-react";
import { marketing } from "@/config/marketing";
import { marketingEase } from "@/lib/marketing-motion";
import { LiravaLockup } from "@/components/brand/LiravaLogo";
import Faq from "./Faq";
import FeatureGrid from "./FeatureGrid";
import FitsEverywhere from "./FitsEverywhere";
import HowItWorks from "./HowItWorks";
import ProductDemo from "./ProductDemo";
import ProductPanels from "./ProductPanels";
import RailSection from "./RailSection";
import { FocusText, Reveal, ScrollWords, useScrollerRef } from "./Reveal";
import StatuteExplorer from "./StatuteExplorer";

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

const trust = [
  [Check, "Built for Indian litigation", "Designed around legal work, not generic chat."],
  [Search, "Every answer cited", "File, page, passage, and library context."],
  [LockKeyhole, "Your files stay private", "Private material stays in the right workspace."],
] as const;

function Header() {
  const reduce = Boolean(useReducedMotion());
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const container = useScrollerRef(headerRef);
  const { scrollYProgress } = useScroll({ container });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    const scroller = container.current;
    const read = () => setScrolled((scroller ? scroller.scrollTop : window.scrollY) > 24);
    read();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, [container]);

  // Track which section is under the header so the nav underline follows the reader.
  useEffect(() => {
    const targets = marketing.navigation
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const navClass = "text-muted hover:text-foreground";
  return (
    <header ref={headerRef} className={`soli-nav sticky top-0 z-50 ${scrolled ? "soli-nav-scrolled" : "soli-nav-top"}`}>
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="Lirava home">
          <LiravaLockup className="h-11 w-48" />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {marketing.navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setActive(item.href)}
              aria-current={active === item.href ? "location" : undefined}
              className={`relative text-[13px] font-medium transition-colors ${active === item.href ? "text-foreground" : navClass}`}
            >
              {item.label}
              {active === item.href && (
                <motion.span
                  layoutId="soli-active-nav"
                  className="absolute -bottom-2 left-0 h-0.5 w-full bg-action"
                  transition={{ duration: reduce ? 0 : 0.4, ease: marketingEase }}
                />
              )}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login" className="inline-flex h-10 items-center px-3 text-[13px] font-medium text-muted transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/login" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-action px-4 text-[13px] font-semibold text-on-dark">
            Open Lirava <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: marketingEase }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
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
                className="mt-2 rounded-lg border border-border px-3 py-2.5 text-center text-[14px] font-semibold text-foreground"
              >
                Log in
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      {!reduce && (
        <motion.span
          aria-hidden="true"
          style={{ scaleX: progress }}
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-brand"
        />
      )}
    </header>
  );
}

/** The demo settles into place as it scrolls into view. */
function HeroStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = Boolean(useReducedMotion());
  const container = useScrollerRef(ref);
  const { scrollYProgress } = useScroll({ container, target: ref, offset: ["start end", "start 0.4"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 6, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.98, 1]);
  return (
    <div ref={ref} className="relative" style={{ perspective: 1400 }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-80"
        style={{
          background: "radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 100%)",
        }}
      />
      <motion.div className="relative" style={{ rotateX, scale, transformOrigin: "50% 0%" }}>
        {children}
      </motion.div>
    </div>
  );
}

export default function MarketingSite() {
  return (
    <div className="soli-marketing min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="desk relative overflow-hidden border-t border-border text-foreground">
          {/* Quiet dotted field behind the right half, fading out like a horizon. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-3/5 lg:block"
            style={{
              backgroundImage: "radial-gradient(color-mix(in oklab, var(--foreground) 26%, transparent) 1.2px, transparent 1.2px)",
              backgroundSize: "18px 18px",
              maskImage: "radial-gradient(70% 90% at 100% 25%, black 25%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(70% 90% at 100% 25%, black 25%, transparent 80%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rails relative px-2 pt-12 pb-16 sm:px-8 lg:px-14 lg:pt-16 lg:pb-24">
              <span aria-hidden="true" className="absolute -top-[3px] -left-[3px] hidden size-1.5 border border-border bg-background lg:block" />
              <span aria-hidden="true" className="absolute -top-[3px] -right-[3px] hidden size-1.5 border border-border bg-background lg:block" />
              <div className="max-w-4xl">
                <motion.h1
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: marketingEase }}
                  className="soli-hero-title font-serif text-balance"
                >
                  Counsel, meet your <span className="text-brand-readable">tireless paralegal.</span>
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.12, ease: marketingEase }}
                >
                  <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-muted sm:text-[19px]">
                    From case files to court-ready drafts, Lirava keeps every answer grounded in your documents.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-lg bg-action px-6 text-[15px] font-semibold text-on-dark">
                        Open Lirava <ArrowRight className="size-4" />
                      </Link>
                      <a
                        href="#how-it-works"
                        className="inline-flex h-12 items-center rounded-lg bg-card px-6 text-[15px] font-medium text-foreground shadow-elevated"
                      >
                        See how it works
                      </a>
                    </div>
                    <div aria-label="Supported files" className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
                      <span>PDF case files</span>
                      <span>DOCX drafts</span>
                      <span>Scanned judgments</span>
                    </div>
                  </div>
                </motion.div>
              </div>
              <motion.div
                className="mt-12 sm:mt-14"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.25, ease: marketingEase }}
              >
                <HeroStage>
                  <ProductDemo />
                </HeroStage>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-7xl gap-px px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
            {trust.map(([Icon, title, text], i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="flex gap-4 sm:px-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-[14px] text-muted">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <RailSection className="bg-background">
          <div className="grid gap-12 lg:grid-cols-2">
            <ScrollWords
              text="Legal research should not begin with a blank search box."
              className="font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]"
            />
            <Reveal className="space-y-5 text-[16px] leading-relaxed text-muted">
              <p>
                Litigation teams spend hours locating the right file, checking the exact provision, and rebuilding context before a
                draft can even begin.
              </p>
              <p>
                Generic AI can make that harder when it produces a confident answer without a source. Lirava keeps the underlying
                material in view, so the lawyer can verify the work.
              </p>
            </Reveal>
          </div>
        </RailSection>

        <ProductPanels />
        <HowItWorks />
        <FeatureGrid />
        <StatuteExplorer />

        <RailSection id="security" className="bg-background">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <LockKeyhole className="size-6 text-brand" />
              <h2 className="mt-6 font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">
                Legal work should remain within the right workspace.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-muted">
                Lirava separates a firm’s shared library from each lawyer’s private workspace. Your team decides what is shared;
                private uploads remain private.
              </p>
              <Link href="/security" className="group mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-brand">
                Read security details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2">
              <Reveal delay={0.08}>
                <div className="motion-card h-full rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-semibold">Private workspaces</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    Personal uploads are kept separate from colleagues’ work.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.16}>
                <div className="motion-card h-full rounded-2xl border border-border bg-highlight p-6">
                  <h3 className="font-semibold">Firm controls</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    Approved firm material can be managed in a shared library.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </RailSection>

        <RailSection id="pricing" className="bg-background text-foreground">
          <div>
            <FocusText>
              <h2 className="font-serif text-[38px] tracking-[-0.04em] sm:text-[52px]">Start with one practice group. Grow from there.</h2>
            </FocusText>
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {marketing.pricing.map((tier, i) => (
                <Reveal key={tier.name} delay={i * 0.08}>
                  <article className="motion-card h-full rounded-2xl border border-border bg-card p-6 hover:border-brand/40">
                    <h3 className="text-[18px] font-semibold">{tier.name}</h3>
                    <p className="mt-2 text-[14px] text-muted">{tier.detail}</p>
                    <p className="mt-6 font-serif text-[24px] leading-snug text-foreground">{tier.price}</p>
                    <p className="text-[11px] text-muted">Per seat, volume and storage based</p>
                    <ul className="mt-6 space-y-3">
                      {tier.items.map((item) => (
                        <li key={item} className="flex gap-2 text-[13px] text-muted">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a href={`mailto:${marketing.contactEmail}`} className="group mt-7 inline-flex items-center text-[14px] font-semibold text-brand">
                      Contact us <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </RailSection>

        <FitsEverywhere />

        <RailSection id="faq" className="bg-background">
          <div className="mx-auto max-w-3xl">
            <FocusText>
              <h2 className="text-center font-serif text-[38px] tracking-[-0.04em] sm:text-[52px]">Questions worth asking.</h2>
            </FocusText>
            <Reveal className="mt-10" delay={0.08}>
              <Faq items={questions} />
            </Reveal>
          </div>
        </RailSection>

        <section className="desk relative overflow-hidden border-t border-border py-20 text-center sm:py-24">
          <Reveal className="mx-auto max-w-3xl px-4">
            <h2 className="font-serif text-[34px] leading-[1.08] tracking-[-0.03em] sm:text-[46px]">
              Bring your next matter into Lirava.
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-lg bg-action px-6 text-[15px] font-semibold text-on-dark">
                Open Lirava <ArrowRight className="size-4" />
              </Link>
              <a
                href={`mailto:${marketing.contactEmail}`}
                className="inline-flex h-12 items-center rounded-lg bg-card px-6 text-[15px] font-medium text-foreground shadow-elevated"
              >
                Contact us
              </a>
            </div>
          </Reveal>
        </section>
      </main>
      <footer className="bg-navy text-on-dark-muted">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.6fr_repeat(3,1fr)] lg:px-8">
          <div>
            <p className="font-serif text-[32px] tracking-[-.04em] text-on-dark">Lirava</p>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed">A source-aware workspace for legal professionals.</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-on-dark">Product</p>
            <div className="mt-4 grid gap-2 text-[13px]">
              <a href="#product">Overview</a>
              <a href="#how-it-works">How it works</a>
              <a href="#pricing">Pricing</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-on-dark">Company</p>
            <div className="mt-4 grid gap-2 text-[13px]">
              <a href="#faq">FAQ</a>
              <a href={`mailto:${marketing.contactEmail}`}>Contact</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-on-dark">Legal</p>
            <div className="mt-4 grid gap-2 text-[13px]">
              <Link href="/security">Security</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-5 text-[12px] sm:px-6 lg:px-8">
            © 2026 Lirava. AI assistance for legal professionals; not legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
