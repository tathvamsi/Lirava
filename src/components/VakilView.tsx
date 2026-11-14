"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listMatters } from "@/app/actions";
import { useStore } from "@/lib/store";
import type { Matter } from "@/lib/types";
import Chat from "./Chat";
import { MenuButton } from "./MobileBar";

export default function VakilView({ vakilId, conversation, matterId }: { vakilId: string; conversation?: string; matterId?: string }) {
  const vakil = useStore((s) => s.vakils.find((d) => d.id === vakilId));
  const loaded = useStore((s) => s.loaded);
  const conversations = useStore((s) => s.conversations);
  const [matters, setMatters] = useState<Matter[]>([]);

  useEffect(() => {
    let active = true;
    void listMatters()
      .then((items) => active && setMatters(items))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // The chat being shown: the one in the address, a brand-new one, or the latest.
  const current = useMemo(() => {
    if (conversation === "new") return undefined;
    if (conversation) return conversations.find((c) => c.id === conversation);
    return conversations
      .filter((c) => c.vakilId === vakilId)
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];
  }, [conversation, conversations, vakilId]);
  const phase = useStore((s) => (current ? s.running[current.id] : undefined));

  if (!vakil) {
    return <div className="flex flex-1 items-center justify-center text-body-sm text-foreground/60">{loaded ? "This counsel doesn't exist." : "Loading…"}</div>;
  }

  const activeMatterId = current?.matterId ?? matterId;
  const matter = activeMatterId ? matters.find((m) => m.id === activeMatterId) : undefined;
  const working = Boolean(phase) || vakil.status === "working";
  const title = current?.title || "New chat";
  const base = `/vakil/${vakil.id}`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4">
        <MenuButton />
        <div className="min-w-0 flex-1 leading-tight">
          {matter ? (
            <Link href={`/matters/${matter.id}`} className="block truncate text-[11px] text-muted transition-colors hover:text-foreground">
              {matter.title}
            </Link>
          ) : (
            <Link href={base} className="block truncate text-[11px] text-muted transition-colors hover:text-foreground">
              Lirava
            </Link>
          )}
          <h1 className="truncate font-sans text-[14px] font-medium tracking-normal text-foreground">{title}</h1>
        </div>
        {working && (
          <span role="status" className="inline-flex shrink-0 items-center gap-2 rounded-[999px] border border-border px-3 py-1 text-[12px] text-muted">
            <span className="live-dot size-1.5 rounded-[999px] bg-brand text-brand" aria-hidden="true" />
            {phase === "queued" ? "Waiting for a free slot" : "Working"}
          </span>
        )}
      </header>

      <Chat key={`${vakil.id}:${conversation ?? "latest"}:${matterId ?? "none"}`} vakil={vakil} conversation={conversation} matterId={matterId} matterLabel={matter?.title} />
    </div>
  );
}
