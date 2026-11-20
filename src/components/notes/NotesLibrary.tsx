"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NotebookPen, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/SettingsKit";
import { kbRequest } from "@/lib/knowledge-api";
import { timeAgo } from "@/lib/status";

type NoteSummary = { id: string; title: string; preview: string; matterId: string | null; updatedAt: number };

/** The user's notes, newest first, with a search box and a button that starts a new one. */
export default function NotesLibrary({ embedded = false, onOpen }: { embedded?: boolean; onOpen?: (id: string) => void } = {}) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void kbRequest<{ notes: NoteSummary[] }>("/api/notes").then((res) => {
      if (!active) return;
      if (res.ok) setNotes(res.data.notes);
      else {
        setNotes([]);
        setError(res.error);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notes ?? []).filter((n) => !q || n.title.toLowerCase().includes(q) || n.preview.toLowerCase().includes(q));
  }, [notes, query]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    const res = await kbRequest<{ note: { id: string } }>("/api/notes", { method: "POST", body: { title: "", content: "" } });
    if (res.ok) {
      if (onOpen) onOpen(res.data.note.id);
      else router.push(`/notes/${encodeURIComponent(res.data.note.id)}`);
    }
    else {
      setCreating(false);
      setError(res.error);
    }
  };

  return (
    <div className={embedded ? "" : "flex-1 overflow-y-auto"}>
      <div className={embedded ? "" : "rails mx-auto min-h-full max-w-[1080px] px-4 pb-16 sm:px-8"}>
        {embedded ? (
          <p className="mb-4 text-body-sm text-foreground/55">Your own working notes: research, hearing preparation, ideas. Private to your account.</p>
        ) : (
          <PageHeader eyebrow="Library" title="Notes" description="Your own working notes: research, hearing preparation, ideas. Private to your account." />
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Search notes</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-foreground/40" strokeWidth={1.75} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="h-9 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-[13.5px] outline-none placeholder:text-foreground/35 focus:border-brand/60" />
          </label>
          <button type="button" onClick={() => void create()} disabled={creating} className="btn-primary flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-60">
            <Plus className="size-4" strokeWidth={1.75} />
            New note
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-[12.5px] text-destructive">
            {error}
          </p>
        )}

        {notes === null ? (
          <p className="text-body-sm text-foreground/45">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-body-sm text-foreground/55">{notes.length === 0 ? "No notes yet. Start one with “New note”." : "No notes match your search."}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/notes/${encodeURIComponent(n.id)}`}
                  onClick={onOpen ? (e) => { e.preventDefault(); onOpen(n.id); } : undefined}
                  className="surface flex h-full items-start gap-3 p-4 transition-colors hover:border-brand/40">
                  <NotebookPen className="mt-0.5 size-4 shrink-0 text-foreground/50" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{n.title || "Untitled"}</span>
                    {n.preview && <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-foreground/60">{n.preview}</span>}
                    <span className="mt-2 block font-mono text-[11px] text-foreground/50">{timeAgo(n.updatedAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
