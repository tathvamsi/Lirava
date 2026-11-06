import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

export function InformationPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-navy/10 bg-background">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-on-dark">
              <Scale className="size-4" />
            </span>
            <span className="font-serif text-[22px] font-semibold">Lirava</span>
          </Link>
          <Link href="/" className="text-[13px] font-semibold text-brand">
            Back to Lirava
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <h1 className="mt-10 font-serif text-[44px] leading-[1.04] tracking-[-0.045em] sm:text-[60px]">
          {title}
        </h1>
        <p className="mt-4 text-[14px] text-muted">{eyebrow}</p>
        <div className="prose prose-slate mt-10 max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:text-muted">
          {children}
        </div>
      </main>
    </div>
  );
}
