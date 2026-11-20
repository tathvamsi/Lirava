"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/SettingsKit";
import { useStore } from "@/lib/store";

/** What Lirava is, whether it is connected, and where the policies are. */
export default function AboutPanel() {
  const connected = useStore((s) => s.connected);
  return (
    <>
      <Section eyebrow="About" title="Lirava" description="An AI workspace for Indian litigation teams, with matter-centred chats, documents, research and drafts.">
        <div className="surface flex items-center gap-3 p-4">
          <span className={`size-2 shrink-0 rounded-full ${connected ? "bg-success" : "bg-foreground/30"}`} aria-hidden />
          <span className="flex-1 text-body-sm">{connected ? "Connected to the Lirava service." : "Reconnecting to the Lirava service…"}</span>
        </div>
        <p className="mt-3 text-[12.5px] text-foreground/55">Answers are research aids, not legal advice. Check every citation against the official source before relying on it.</p>
      </Section>

      <Section eyebrow="Policies" title="Privacy and terms">
        <ul className="surface divide-y divide-border">
          {[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/security", label: "Security" },
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 p-3 transition-colors hover:bg-highlight">
                <ShieldCheck className="size-4 text-foreground/50" strokeWidth={1.5} aria-hidden />
                <span className="flex-1 text-body-sm">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
