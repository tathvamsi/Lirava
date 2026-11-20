"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { listMatters } from "@/app/actions";
import { kbRequest } from "@/lib/knowledge-api";
import type { Matter } from "@/lib/types";

type Note = { id: string; title: string; content: string; matterId: string | null };
type Draft = { title: string; content: string; matterId: string | null };
type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 800;

/** Edits one note. Changes are saved automatically a moment after typing stops. */
export default function NoteEditor({ id, onBack }: { id: string; /** When given (inside the settings dialog), going back and deleting call this instead of navigating. */ onBack?: () => void }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ title: "", content: "", matterId: null });
  const [matters, setMatters] = useState<Matter[]>([]);
  const [state, setState] = useState<SaveState>("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);
  const pending = useRef<Draft | null>(null);

  useEffect(() => {
    let active = true;
    void kbRequest<{ note: Note }>(`/api/notes/${encodeURIComponent(id)}`).then((res) => {
      if (!active) return;
      if (res.ok) {
        setDraft({ title: res.data.note.title, content: res.data.note.content, matterId: res.data.note.matterId });
        setLoaded(true);
      } else setMissing(true);
    });
    void listMatters().then((list) => active && setMatters(list)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id]);

  // Leaving the page with an unsaved edit still sends it.
  useEffect(() => {
    return () => {
      if (timer.current !== null && pending.current) {
        window.clearTimeout(timer.current);
        void fetch(`/api/notes/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current), keepalive: true }).catch(() => undefined);
      }
    };
  }, [id]);

  const save = async () => {
    const body = pending.current;
    timer.current = null;
    if (!body) return;
    pending.current = null;
    const res = await kbRequest(`/api/notes/${encodeURIComponent(id)}`, { method: "PUT", body });
    if (res.ok) setState("saved");
    else {
      setState("error");
      setError(res.error);
    }
  };

  const change = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setState("saving");
    setError("");
    pending.current = next;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
  };

  const remove = async () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    const res = await kbRequest(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      if (onBack) onBack();
      else router.push("/notes");
    }
    else {
      setConfirmDelete(false);
      setError(res.error);
    }
  };

  if (missing) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-16 text-center sm:px-8">
        <p className="text-foreground/60">This note was not found.</p>
        <Link href="/notes" className="mt-3 inline-block text-[13px] text-brand-readable hover:underline">
          Back to Notes
        </Link>
      </div>
    );
  }

  return (
    <div className={onBack ? "" : "flex-1 overflow-y-auto"}>
      <div className={onBack ? "flex flex-col" : "mx-auto flex min-h-full max-w-[820px] flex-col px-4 pb-10 sm:px-8"}>
        <div className={`flex items-center gap-3 ${onBack ? "" : "pt-8"}`}>
          <Link href="/notes" onClick={onBack ? (e) => { e.preventDefault(); onBack(); } : undefined} className="inline-flex items-center gap-1.5 text-[13px] text-foreground/60 hover:text-foreground">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Notes
          </Link>
          <span role="status" className="ml-auto font-mono text-[11px] text-foreground/50">
            {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Not saved" : ""}
          </span>
        </div>

        {!loaded ? (
          <p className="pt-8 text-body-sm text-foreground/45">Loading…</p>
        ) : (
          <>
            <label className="sr-only" htmlFor="note-title">
              Title
            </label>
            <input
              id="note-title"
              value={draft.title}
              maxLength={200}
              onChange={(e) => change({ title: e.target.value })}
              placeholder="Untitled"
              className="mt-6 w-full border-0 bg-transparent font-serif text-[30px] font-semibold tracking-[-0.03em] outline-none placeholder:text-foreground/30"
            />

            <label className="mt-2 flex items-center gap-2 text-[12.5px] text-foreground/60">
              Matter
              <select value={draft.matterId ?? ""} onChange={(e) => change({ matterId: e.target.value || null })} className="h-8 max-w-[260px] rounded-lg border border-border bg-card px-2 text-[12.5px] text-foreground">
                <option value="">None</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="sr-only" htmlFor="note-body">
              Note
            </label>
            <textarea
              id="note-body"
              value={draft.content}
              maxLength={50000}
              onChange={(e) => change({ content: e.target.value })}
              placeholder="Write your note. Markdown works: # heading, **bold**, - list."
              className="mt-4 min-h-[50vh] w-full flex-1 resize-none rounded-xl border border-border bg-card p-4 text-[15px] leading-[1.65] outline-none placeholder:text-foreground/35 focus:border-brand/60"
            />

            {error && (
              <p role="alert" className="mt-3 text-[12.5px] text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-[12.5px] text-destructive">Delete this note?</span>
                  <button type="button" onClick={() => void remove()} className="btn-quiet h-8 px-3 text-[13px] text-destructive">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="btn-quiet h-8 px-3 text-[13px]">
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="btn-quiet flex h-8 items-center gap-1.5 px-3 text-[13px] text-foreground/60">
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                  Delete note
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
