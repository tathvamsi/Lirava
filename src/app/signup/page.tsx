import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, FolderLock, Scale, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Lirava account.",
};

const HIGHLIGHTS = [
  {
    icon: FolderLock,
    title: "Matters stay siloed",
    body: "Every client workspace keeps its own files, threads, and memory.",
  },
  {
    icon: FileSearch,
    title: "Research with receipts",
    body: "Answers cite the statutes, filings, and docs they came from.",
  },
  {
    icon: ShieldCheck,
    title: "Confidential by design",
    body: "Your matters are private to your account. Nothing trains on them.",
  },
];

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-[1320px] lg:grid-cols-[1.08fr_0.92fr]">
        {/* ── Brand panel ─────────────────────────────────────────── */}
        <section
          aria-label="About Lirava"
          className="relative hidden overflow-hidden border-x border-border bg-background text-foreground lg:flex lg:flex-col lg:justify-between lg:p-12"
        >
          <div
            aria-hidden
            className="dot-grid absolute inset-0 opacity-[0.16] invert"
          />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-brand text-card">
                <Scale className="size-[18px]" strokeWidth={2.25} />
              </span>
              <span className="font-serif text-[22px] font-semibold tracking-tight">
                Lirava
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                Legal workspace
              </span>
            </Link>

            <h1 className="mt-10 max-w-lg font-serif text-4xl leading-[1.05] font-semibold tracking-tight text-balance xl:text-[58px]">
              Set up your firm&apos;s legal workspace.
            </h1>
            <p className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-muted">
              Keep every matter, memo, and source in one account.
            </p>

            <ul className="mt-8 flex flex-col gap-2.5">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 backdrop-blur-sm"
                >
                  <span className="grid size-9 shrink-0 place-items-center text-brand">
                    <item.icon className="size-[18px]" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block font-sans text-[14px] font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block font-sans text-[13px] leading-relaxed text-muted">
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-10 text-[12px] text-muted">
            Attorney work product, kept private to your account.
          </p>
        </section>

        {/* ── Form column ─────────────────────────────────────────── */}
        <section
          aria-label="Sign up"
          className="relative flex flex-col justify-center bg-card px-5 py-10 sm:px-10 lg:px-16"
        >
          <div
            aria-hidden
            className="dot-grid absolute inset-x-0 top-0 h-44 opacity-[0.08] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <Link
            href="/"
            className="relative mb-8 inline-flex items-center gap-2.5 lg:hidden"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-brand text-background">
              <Scale className="size-[18px]" strokeWidth={2.25} />
            </span>
            <span className="font-serif text-[22px] font-semibold tracking-tight">
              Lirava
            </span>
          </Link>

          <div className="relative mx-auto w-full max-w-[420px]">
            <SignupForm />
            <p className="mt-6 text-center text-[12px] text-muted">
            Protected by account-scoped sessions and SOC 2 practices
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
