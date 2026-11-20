"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/SettingsKit";
import { kbRequest, type KnowledgeBase } from "@/lib/knowledge-api";
import { timeAgo } from "@/lib/status";

/** The user's knowledge bases: named collections of their own documents that can be attached to a chat or matter. */
export default function KnowledgeLibrary({ embedded = false, onOpen }: { embedded?: boolean; onOpen?: (id: string) => void } = {}) {
  const [bases, setBases] = useState<KnowledgeBase[] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void kbRequest<{ knowledgeBases: KnowledgeBase[] }>("/api/knowledge-bases").then((res) => {
      if (!active) return;
      if (res.ok) setBases(res.data.knowledgeBases);
      else {
        setBases([]);
        setError(res.error);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const create = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    const res = await kbRequest<{ knowledgeBase: KnowledgeBase }>("/api/knowledge-bases", { method: "POST", body: { name, description } });
    setCreating(false);
    if (res.ok) {
      setBases((b) => [res.data.knowledgeBase, ...(b ?? [])]);
      setName("");
      setDescription("");
    } else setError(res.error);
  };

  return (
    <div className={embedded ? "" : "flex-1 overflow-y-auto"}>
      <div className={embedded ? "" : "rails mx-auto min-h-full max-w-[1080px] px-4 pb-16 sm:px-8"}>
        {embedded ? (
          <p className="mb-4 text-body-sm text-foreground/55">Collections of your own documents. Attach one to a chat or a matter and Lirava answers from it and cites the page.</p>
        ) : (
          <PageHeader eyebrow="Library" title="Knowledge" description="Collections of your own documents, such as precedents you rely on. Attach one to a chat or a matter and Lirava answers from it and cites the page." />
        )}

        <form
          className="surface mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="block text-[12px] text-foreground/60">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="My bail precedents"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-[13.5px] text-foreground outline-none placeholder:text-foreground/35 focus:border-brand/60"
            />
          </label>
          <label className="block text-[12px] text-foreground/60">
            What it is for (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="Supreme Court orders on regular bail"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-[13.5px] text-foreground outline-none placeholder:text-foreground/35 focus:border-brand/60"
            />
          </label>
          <button type="submit" disabled={!name.trim() || creating} className="btn-primary flex h-9 items-center justify-center gap-1.5 px-3 text-[13px] disabled:opacity-40">
            <Plus className="size-4" strokeWidth={1.75} />
            Create
          </button>
        </form>

        {error && (
          <p role="alert" className="mb-4 text-[12.5px] text-destructive">
            {error}
          </p>
        )}

        {bases === null ? (
          <p className="text-body-sm text-foreground/45">Loading…</p>
        ) : bases.length === 0 ? (
          <p className="text-body-sm text-foreground/55">No knowledge bases yet. Create one above, then add your documents to it.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {bases.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/knowledge/${encodeURIComponent(b.id)}`}
                  onClick={onOpen ? (e) => { e.preventDefault(); onOpen(b.id); } : undefined}
                  className="surface flex h-full items-start gap-3 p-4 transition-colors hover:border-brand/40">
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-foreground/50" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{b.name}</span>
                    {b.description && <span className="mt-0.5 block text-[12.5px] text-foreground/60">{b.description}</span>}
                    <span className="mt-2 block font-mono text-[11px] text-foreground/50">
                      {b.fileCount} {b.fileCount === 1 ? "file" : "files"} · updated {timeAgo(b.updatedAt)}
                    </span>
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
