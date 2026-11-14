"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, Mail, Monitor, Smartphone } from "lucide-react";
import { marketing } from "@/config/marketing";
import { FocusText, Reveal } from "./Reveal";
import RailSection from "./RailSection";

const cards = [
  { icon: Monitor, title: "Web workspace", text: "Matters, chats and sources in one place.", action: "Open Lirava", href: "/login", internal: true },
  { icon: Smartphone, title: "On your phone", text: "The same workspace on a phone screen.", action: "Sign in on your phone", href: "/login", internal: true },
  { icon: FileText, title: "Your case files", text: "PDF case files, DOCX drafts and scanned judgments.", action: "See how it works", href: "#how-it-works", internal: false },
  { icon: Mail, title: "Your firm", text: "Talk to us about a shared library and rollout.", action: "Contact us", href: `mailto:${marketing.contactEmail}`, internal: false },
] as const;

export default function FitsEverywhere() {
  return (
    <RailSection className="bg-background">
      <div>
        <FocusText>
          <h2 className="font-serif text-[38px] leading-[1.06] tracking-[-0.04em] sm:text-[52px]">Wherever the work happens.</h2>
        </FocusText>
        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {cards.map((card, i) => {
            const Icon = card.icon;
            const inner = (
              <>
                <Icon className="size-5 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold text-foreground">{card.title}</p>
                  <p className="mt-1 text-[14px] text-muted">{card.text}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand">
                  {card.action} <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </>
            );
            const cls = "motion-card group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-brand/40";
            return (
              <Reveal key={card.title} delay={i * 0.07}>
                {card.internal ? (
                  <Link href={card.href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <a href={card.href} className={cls}>
                    {inner}
                  </a>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </RailSection>
  );
}
