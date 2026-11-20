"use client";

import Link from "next/link";
import { useState } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { deleteConversation, setConversationFlags } from "@/app/actions";
import { Section } from "@/components/SettingsKit";
import { deleteConversationLocally, updateConversationFlagsLocally, useStore } from "@/lib/store";
import { timeAgo } from "@/lib/status";

/** Chats the user has archived, with a way to bring one back or delete it. */
export default function ArchivedChatsPanel() {
  const conversations = useStore((s) => s.conversations);
  const loaded = useStore((s) => s.loaded);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  const archived = conversations.filter((c) => c.archived).sort((a, b) => b.updatedAt - a.updatedAt);

  const restore = async (id: string) => {
    setError("");
    updateConversationFlagsLocally(id, { archived: false });
    try {
      await setConversationFlags(id, { archived: false });
    } catch {
      updateConversationFlagsLocally(id, { archived: true });
      setError("Could not restore that chat. Please try again.");
    }
  };

  const remove = async (id: string) => {
    setError("");
    setConfirming(null);
    try {
      await deleteConversation(id);
      deleteConversationLocally(id);
    } catch {
      setError("Could not delete that chat. Please try again.");
    }
  };

  return (
    <Section eyebrow="Archive" title="Archived chats" description="Chats you have archived. Restore one to see it in your sidebar again.">
      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-destructive">
          {error}
        </p>
      )}
      {!loaded ? (
        <p className="text-body-sm text-foreground/45">Loading…</p>
      ) : archived.length === 0 ? (
        <p className="text-body-sm text-foreground/55">You have no archived chats.</p>
      ) : (
        <ul className="surface divide-y divide-border">
          {archived.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <Link href={`/vakil/${encodeURIComponent(c.vakilId)}?c=${encodeURIComponent(c.id)}`} className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] hover:underline">{c.title || "Untitled chat"}</span>
                <span className="block font-mono text-[11px] text-foreground/50">{timeAgo(c.updatedAt)}</span>
              </Link>
              {confirming === c.id ? (
                <>
                  <span className="text-[12px] text-destructive">Delete?</span>
                  <button type="button" onClick={() => void remove(c.id)} className="btn-quiet h-8 px-2.5 text-[12.5px] text-destructive">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className="btn-quiet h-8 px-2.5 text-[12.5px]">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => void restore(c.id)} aria-label={`Restore ${c.title}`} title="Restore" className="btn-quiet size-8 p-0">
                    <ArchiveRestore className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => setConfirming(c.id)} aria-label={`Delete ${c.title}`} title="Delete" className="btn-quiet size-8 p-0">
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
