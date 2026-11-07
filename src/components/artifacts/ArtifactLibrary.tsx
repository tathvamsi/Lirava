"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, BookOpen, FileText, Files, MessageSquare, Plus, RefreshCw, Scale, Search, X } from "lucide-react";
import { z } from "zod";
import type { DocumentArtifact } from "@/lib/types";
import { DocumentPreview } from "./DocumentPreview";

const responseSchema = z.object({
  artifacts: z.array(z.object({
    id: z.string().min(1),
    dotId: z.string().min(1),
    conversationId: z.string().nullable(),
    title: z.string(),
    filename: z.string(),
    kind: z.enum(["legal_paper", "text", "markdown", "pdf", "docx", "contract"]).or(z.literal("document").transform(() => "text" as const)),
    content: z.string(),
    summary: z.string().nullish(),
    fileId: z.string().nullish(),
    pdfFileId: z.string().nullish(),
    docxFileId: z.string().nullish(),
    createdAt: z.number().int().min(0).max(8640000000000000),
    updatedAt: z.number().int().min(0).max(8640000000000000),
  })),
});

const filters = ["All documents", "Pleadings", "Research & notes", "Contracts", "Other files"] as const;
type Filter = (typeof filters)[number];
function category(kind: DocumentArtifact["kind"]): Filter {
  if (kind === "legal_paper") return "Pleadings";
  if (kind === "contract") return "Contracts";
  if (kind === "text" || kind === "markdown") return "Research & notes";
  return "Other files";
}

function excerpt(artifact: DocumentArtifact) {
  return (artifact.summary || artifact.content).replace(/[#*_>`~]/g, "").replace(/\s+/g, " ").trim();
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function ArtifactLibrary() {
  const [artifacts, setArtifacts] = useState<DocumentArtifact[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All documents");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<DocumentArtifact | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    async function load() {
      try {
        const response = await fetch("/api/artifacts?agentOnly=true", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]), cache: "no-store" });
        if (response.status === 401) throw new Error("Your session has expired. Log in to view your documents.");
        if (!response.ok) throw new Error("We couldn’t load your documents. Please try again.");
        const data = responseSchema.parse(await response.json());
        if (!disposed) setArtifacts(data.artifacts);
      } catch (error) {
        if (!disposed) setError(error instanceof Error && !(error instanceof z.ZodError) ? error.message : "We couldn’t read your documents. Please try again.");
      }
    }
    void load();
    return () => { disposed = true; controller.abort(); };
  }, [attempt]);

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);

  function refresh() {
    setError("");
    setArtifacts(null);
    setAttempt((value) => value + 1);
  }

  async function download(artifact: DocumentArtifact, fileId?: string | null, extension = "md") {
    setDownloading(true);
    setDownloadError("");
    try {
      let blob: Blob;
      if (fileId) {
        const response = await fetch(`/api/files/${encodeURIComponent(fileId)}?download=1`, { signal: AbortSignal.timeout(20000) });
        if (!response.ok || response.redirected) throw new Error("Download unavailable. Please try again.");
        blob = await response.blob();
      } else {
        blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(artifact.title || "document").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")}.${extension}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("The download failed. Your document is still saved. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const needle = query.trim().toLowerCase();
  const agentArtifacts = (artifacts || []).filter((artifact) => artifact.conversationId && artifact.dotId);
  const visible = agentArtifacts.filter((artifact) =>
    (filter === "All documents" || category(artifact.kind) === filter) &&
    (!needle || [artifact.title, artifact.filename, artifact.summary, artifact.content].some((value) => value?.toLowerCase().includes(needle))),
  ).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt);

  return (
    <section aria-labelledby="artifacts-heading" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-10 sm:py-14">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brand-readable"><Files className="size-4" aria-hidden /> Your workspace</p>
            <h1 id="artifacts-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">Artifacts</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted">Your research, pleadings, and drafts. Ready to pick up where you left off.</p>
          </div>
          <Link href="/" className="btn-primary inline-flex h-10 items-center gap-2 px-4 text-sm"><Plus className="size-4" aria-hidden /> Create in chat</Link>
        </header>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" aria-label="Search documents" placeholder="Search titles or document contents" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-lg bg-card pl-10 pr-4 text-sm placeholder:text-muted" />
          </div>
          <select aria-label="Sort documents" value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-lg bg-card px-3 text-sm text-foreground">
            <option value="recent">Recently updated</option><option value="title">Title A–Z</option>
          </select>
          <button type="button" title="Refresh documents" aria-label="Refresh documents" onClick={refresh} disabled={!artifacts && !error} className="btn-quiet size-11 shrink-0 disabled:opacity-40"><RefreshCw className="size-4" aria-hidden /></button>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter documents">
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${filter === item ? "bg-highlight text-foreground" : "text-muted hover:bg-card hover:text-foreground"}`}>{item}</button>
          ))}
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl bg-card p-8" role="alert">
            <h2 className="font-semibold">Documents are unavailable</h2><p className="mt-2 text-sm text-muted">{error}</p>
            <div className="mt-5 flex gap-4"><button type="button" onClick={refresh} className="btn-secondary px-4 py-2 text-sm">Try again</button><Link href="/login" className="btn-quiet px-3 py-2 text-sm">Log in</Link></div>
          </div>
        ) : artifacts === null ? (
          <div className="mt-8" role="status" aria-label="Loading documents">
            <p className="text-sm text-muted">Loading your documents…</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>{[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-2xl bg-card motion-safe:animate-pulse" />)}</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-2xl bg-card px-6 py-12 text-center">
            <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-highlight text-brand-readable"><Files className="size-7" strokeWidth={1.5} aria-hidden /></div>
            <h2 className="text-xl font-semibold">{artifacts.length ? "No documents found" : "Good work deserves a place to live."}</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{artifacts.length ? "Try another search or document type." : "Ask Lirava to draft a pleading, prepare a research note, or review an agreement. Saved artifacts will appear here."}</p>
            {artifacts.length ? <button type="button" onClick={() => { setQuery(""); setFilter("All documents"); }} className="btn-secondary mt-6 px-4 py-2 text-sm">Clear filters</button> : <Link href="/" className="btn-primary mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm">Start a conversation <ArrowUpRight className="size-4" aria-hidden /></Link>}
          </div>
        ) : (
          <>
            <p className="mt-8 text-xs text-muted" role="status">{visible.length} {visible.length === 1 ? "document" : "documents"}{visible.length !== agentArtifacts.length ? ` of ${agentArtifacts.length}` : ""}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((artifact) => {
                const Icon = artifact.kind === "legal_paper" || artifact.kind === "contract" ? Scale : artifact.kind === "markdown" || artifact.kind === "text" ? BookOpen : FileText;
                return (
                  <button type="button" key={artifact.id} onClick={() => { setDownloadError(""); setSelected(artifact); }} aria-label={`Open ${artifact.title || "Untitled document"}`} className="group flex min-w-0 flex-col rounded-2xl bg-card p-5 text-left transition-colors hover:bg-highlight">
                    <div className="flex w-full items-center justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-background text-brand-readable"><Icon className="size-5" strokeWidth={1.5} aria-hidden /></span><span className="text-[11px] text-muted">{category(artifact.kind)}</span></div>
                    <h2 className="mt-5 line-clamp-2 text-base font-semibold leading-6">{artifact.title || "Untitled document"}</h2>
                    <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-muted">{excerpt(artifact) || "Open to view this document."}</p>
                    <div className="mt-auto flex w-full items-end justify-between gap-3 pt-7 text-[11px] text-muted"><span>Updated {dateFormat.format(artifact.updatedAt)}<span className="mt-1 block">{[artifact.pdfFileId && "PDF", artifact.docxFileId && "Word", artifact.content && "Text"].filter(Boolean).join(" · ") || "Document"}</span></span><ArrowUpRight className="size-4 text-muted transition-colors group-hover:text-brand-readable" aria-hidden /></div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <dialog ref={dialog} aria-labelledby="artifact-title" onClose={() => setSelected(null)} className="fixed inset-0 m-auto h-[92dvh] max-h-none w-[calc(100%-1rem)] max-w-5xl flex-col overflow-hidden rounded-2xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70 open:flex sm:w-[calc(100%-3rem)]">
        {selected && <>
          <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-5 sm:px-6">
            <div className="min-w-0"><p className="mb-1 text-xs text-brand-readable">{category(selected.kind)}</p><h2 id="artifact-title" className="line-clamp-2 text-lg font-semibold">{selected.title || "Untitled document"}</h2></div>
            <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close document" className="btn-quiet size-9 shrink-0"><X className="size-5" aria-hidden /></button>
          </header>
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
            {selected.conversationId && <Link href={`/vakil/${encodeURIComponent(selected.dotId.replace(/^dot_/, "vakil_"))}?c=${encodeURIComponent(selected.conversationId)}`} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"><MessageSquare className="size-3.5" aria-hidden /> Open chat</Link>}
            {selected.content && <button type="button" disabled={downloading} onClick={() => void download(selected, null, selected.kind === "text" ? "txt" : "md")} className="btn-quiet gap-1.5 px-3 py-2 text-xs disabled:opacity-40"><ArrowDownToLine className="size-3.5" aria-hidden /> Download text</button>}
            {selected.pdfFileId && <button type="button" disabled={downloading} onClick={() => void download(selected, selected.pdfFileId, "pdf")} className="btn-quiet px-3 py-2 text-xs disabled:opacity-40">Download PDF</button>}
            {selected.docxFileId && <button type="button" disabled={downloading} onClick={() => void download(selected, selected.docxFileId, "docx")} className="btn-quiet px-3 py-2 text-xs disabled:opacity-40">Download Word</button>}
            {!selected.pdfFileId && !selected.docxFileId && selected.fileId && <button type="button" disabled={downloading} onClick={() => void download(selected, selected.fileId, selected.filename.split(".").pop() || "txt")} className="btn-quiet px-3 py-2 text-xs disabled:opacity-40">Download file</button>}
            {downloading && <span role="status" className="text-xs text-muted">Preparing download…</span>}
          </div>
          {downloadError && <p role="alert" className="px-4 pb-3 text-sm text-brand-readable sm:px-6">{downloadError}</p>}
          <div className="min-h-0 flex-1"><DocumentPreview key={selected.id} artifact={selected} /></div>
        </>}
      </dialog>
    </section>
  );
}
