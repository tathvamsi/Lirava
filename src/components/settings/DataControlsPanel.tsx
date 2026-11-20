"use client";

import { useState } from "react";
import { Archive, Download, Trash2 } from "lucide-react";
import { deleteConversation, setConversationFlags } from "@/app/actions";
import { Section } from "@/components/SettingsKit";
import { deleteConversationLocally, getState, updateConversationFlagsLocally, useStore } from "@/lib/store";

type Progress = { label: string; done: number; total: number } | null;

/** Export every chat, or archive or delete all of the general ones. Chats inside a matter are never archived or deleted here. */
export default function DataControlsPanel() {
  const conversations = useStore((s) => s.conversations);
  const [progress, setProgress] = useState<Progress>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const general = conversations.filter((c) => !c.matterId);
  const toArchive = general.filter((c) => !c.archived);
  const busy = progress !== null;

  const exportAll = async () => {
    const chats = getState().conversations;
    setMessage(null);
    const exported: Array<Record<string, unknown>> = [];
    let failed = 0;
    for (let i = 0; i < chats.length; i++) {
      setProgress({ label: "Exporting", done: i, total: chats.length });
      const c = chats[i];
      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(c.id)}`, { cache: "no-store" });
        const data = (await res.json()) as { messages?: Array<Record<string, unknown>> };
        if (!res.ok) throw new Error("not loaded");
        exported.push({
          id: c.id,
          title: c.title,
          matterId: c.matterId ?? null,
          pinned: Boolean(c.pinned),
          archived: Boolean(c.archived),
          createdAt: new Date(c.createdAt).toISOString(),
          updatedAt: new Date(c.updatedAt).toISOString(),
          messages: (data.messages ?? []).map((m) => ({ role: m.role, text: m.text, createdAt: m.createdAt, ...(m.citations ? { citations: m.citations } : {}) })),
        });
      } catch {
        failed++;
      }
    }
    setProgress(null);
    if (!exported.length && chats.length) return setMessage({ ok: false, text: "Could not read your chats. Please try again." });
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), chats: exported }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lirava-chats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage({ ok: failed === 0, text: failed ? `Exported ${exported.length} chats. ${failed} could not be read.` : `Exported ${exported.length} ${exported.length === 1 ? "chat" : "chats"}.` });
  };

  const archiveAll = async () => {
    const targets = toArchive;
    setMessage(null);
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      setProgress({ label: "Archiving", done: i, total: targets.length });
      updateConversationFlagsLocally(targets[i].id, { archived: true });
      try {
        await setConversationFlags(targets[i].id, { archived: true });
      } catch {
        failed++;
        updateConversationFlagsLocally(targets[i].id, { archived: false });
      }
    }
    setProgress(null);
    setMessage({ ok: failed === 0, text: failed ? `Archived ${targets.length - failed} chats. ${failed} could not be archived.` : `Archived ${targets.length} ${targets.length === 1 ? "chat" : "chats"}.` });
  };

  const deleteAll = async () => {
    const targets = general;
    setConfirmDelete(false);
    setMessage(null);
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      setProgress({ label: "Deleting", done: i, total: targets.length });
      try {
        await deleteConversation(targets[i].id);
        deleteConversationLocally(targets[i].id);
      } catch {
        failed++;
      }
    }
    setProgress(null);
    setMessage({ ok: failed === 0, text: failed ? `Deleted ${targets.length - failed} chats. ${failed} could not be deleted.` : `Deleted ${targets.length} ${targets.length === 1 ? "chat" : "chats"}.` });
  };

  return (
    <>
      <Section eyebrow="Your data" title="Export chats" description="Download all of your chats, including those inside matters, as one JSON file.">
        <div className="surface flex items-center gap-3 p-4">
          <Download className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
          <span className="flex-1 text-body-sm">{conversations.length} {conversations.length === 1 ? "chat" : "chats"}</span>
          <button type="button" disabled={busy || !conversations.length} onClick={() => void exportAll()} className="btn-primary h-9 px-3 text-[13px] disabled:opacity-40">
            Export
          </button>
        </div>
      </Section>

      <Section eyebrow="Tidy up" title="Archive all chats" description="Moves every general chat out of your sidebar. Chats inside a matter are left where they are.">
        <div className="surface flex items-center gap-3 p-4">
          <Archive className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
          <span className="flex-1 text-body-sm">{toArchive.length} to archive</span>
          <button type="button" disabled={busy || !toArchive.length} onClick={() => void archiveAll()} className="btn-quiet h-9 border border-border px-3 text-[13px] disabled:opacity-40">
            Archive all
          </button>
        </div>
      </Section>

      <Section eyebrow="Danger zone" title="Delete all chats" description="Permanently deletes every general chat, archived ones included. Chats inside a matter are not deleted. This cannot be undone.">
        <div className="surface flex flex-wrap items-center gap-3 p-4">
          <Trash2 className="size-4 shrink-0 text-destructive" strokeWidth={1.5} aria-hidden />
          <span className="flex-1 text-body-sm">{general.length} {general.length === 1 ? "chat" : "chats"}</span>
          {confirmDelete ? (
            <>
              <span className="text-[12.5px] text-destructive">Delete {general.length} {general.length === 1 ? "chat" : "chats"} for good?</span>
              <button type="button" onClick={() => void deleteAll()} className="btn-quiet h-9 px-3 text-[13px] text-destructive">
                Delete everything
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-quiet h-9 px-3 text-[13px]">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" disabled={busy || !general.length} onClick={() => setConfirmDelete(true)} className="btn-quiet h-9 border border-destructive/40 px-3 text-[13px] text-destructive disabled:opacity-40">
              Delete all chats
            </button>
          )}
        </div>
      </Section>

      <div aria-live="polite" className="min-h-6 pt-2 text-[12.5px]">
        {progress && (
          <p className="text-foreground/60">
            {progress.label} {Math.min(progress.done + 1, progress.total)} of {progress.total}…
          </p>
        )}
        {!progress && message && <p className={message.ok ? "text-success" : "text-destructive"}>{message.text}</p>}
      </div>
    </>
  );
}
