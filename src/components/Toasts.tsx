"use client";

import Link from "next/link";
import { dismissToast, markRead, useStore } from "@/lib/store";

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const vakils = useStore((s) => s.vakils);
  return (
    <div
      className="pointer-events-none fixed top-3 right-3 left-3 z-50 flex flex-col gap-2 sm:top-5 sm:right-5 sm:left-auto sm:w-[340px]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const vakil = vakils.find((d) => d.id === t.vakilId);
        const canonicalId = t.vakilId;
        const href = `/vakil/${canonicalId}`;
        return (
          <Link
            key={t.id}
            href={href}
            onClick={() => (markRead(t.vakilId), dismissToast(t.id))}
            className="surface pointer-events-auto p-3.5 shadow-elevated transition-colors hover:border-black/15"
          >
            <span className="min-w-0">
              <span className="eyebrow block">{vakil?.name ?? "Vakil"}</span>
              {t.title !== vakil?.name && <span className="mt-0.5 block text-[14px] font-medium">{t.title}</span>}
              <span className="line-clamp-2 text-body-sm text-foreground/55">{t.body}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
