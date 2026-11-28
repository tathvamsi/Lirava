"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ExternalLink, FileText, Network, ScrollText, X } from "lucide-react";
import { listCaseNodes } from "@/app/actions";
import { setActiveArtifact, useStore } from "@/lib/store";
import type { CaseNode, Citation, Message } from "@/lib/types";

type MatterDocument = { id: string; name: string; status: "ready" | "no_text" | "unsupported" | "failed"; pages: number; unit: "page" | "section" };

const KIND_LABEL: Record<string, string> = { plan: "Plan", legal_paper: "Legal paper", contract: "Contract", docx: "Word document", pdf: "PDF", markdown: "Notes", text: "Text" };
const STATUS_DOT: Record<CaseNode["status"], string> = { confirmed: "bg-emerald-500", proposed: "bg-amber-500", disputed: "bg-red-500" };
const STATUS_TEXT: Record<CaseNode["status"], string> = { confirmed: "Confirmed", proposed: "To confirm", disputed: "Disputed" };

/** Plain text from a document's Markdown, for the small preview on its card. */
const preview = (content: string, title: string) => {
  const text = content.replace(/[#>*_`|\-]+/g, " ").replace(/\s+/g, " ").trim();
  return (text.toLowerCase().startsWith(title.toLowerCase()) ? text.slice(title.length).trim() : text).slice(0, 170);
};

function Section({ title, count, children, defaultOpen = true }: { title: string; count?: number; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border py-4 last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <span className="flex-1 text-[13px] font-medium text-foreground">{title}</span>
        {count !== undefined && <span className="text-[12px] text-muted">{count}</span>}
        <ChevronDown className={`size-4 text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

/**
 * The case at a glance, beside the chat: what this chat produced (documents and plans), the papers in the matter, the case
 * knowledge tree, and the sources the answers used. Everything here opens or links to the real thing.
 */
export function CasePanel({
  matterId,
  conversationId,
  messages,
  onOpenSource,
  onClose,
  width,
}: {
  matterId: string | null;
  conversationId: string | null;
  messages: Message[];
  onOpenSource: (citation: Citation) => void;
  onClose: () => void;
  width: number;
}) {
  const allArtifacts = useStore((s) => s.artifacts);
  const outputs = useMemo(
    () => allArtifacts.filter((a) => a.conversationId === conversationId).sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)),
    [allArtifacts, conversationId],
  );

  const [documents, setDocuments] = useState<MatterDocument[] | null>(null);
  const [nodes, setNodes] = useState<CaseNode[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // The panel is keyed by matter, so each matter starts with fresh state and nothing needs resetting here.
    if (!matterId) return;
    let active = true;
    void fetch(`/api/documents?matterId=${encodeURIComponent(matterId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d: { documents?: MatterDocument[] }) => active && setDocuments(d.documents ?? []))
      .catch(() => active && setDocuments([]));
    listCaseNodes(matterId)
      .then((list) => active && setNodes(list))
      .catch(() => {
        if (active) {
          setNodes([]);
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [matterId]);

  // The sources the answers in this chat were built from, each once.
  const sources = useMemo(() => {
    const seen = new Map<string, Citation>();
    for (const m of messages) {
      for (const c of m.citations ?? []) {
        const key = c.kind === "document" ? `d:${c.fileId}:${c.page}` : c.kind === "case" ? `t:${c.nodeId}` : `s:${c.title}:${c.section ?? ""}`;
        if (!seen.has(key)) seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  }, [messages]);

  const tree = useMemo(() => {
    const list = nodes ?? [];
    return list
      .filter((n) => n.kind === "section")
      .map((section) => ({ section, items: list.filter((n) => n.parentId === section.id) }))
      .filter((g) => g.items.length > 0);
  }, [nodes]);
  const toConfirm = (nodes ?? []).filter((n) => n.kind !== "section" && n.status === "proposed").length;
  const treeCount = (nodes ?? []).filter((n) => n.kind !== "section").length;

  return (
    <aside
      aria-label="Case panel"
      style={{ ["--case-width" as string]: `${width}px` }}
      className="fixed inset-0 z-40 flex min-h-0 flex-col bg-background lg:static lg:z-auto lg:w-[var(--case-width)] lg:shrink-0 lg:border-l lg:border-border"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">Case panel</p>
        <button type="button" onClick={onClose} aria-label="Close case panel" className="btn-quiet size-8 shrink-0 p-0">
          <X className="size-4" />
        </button>
      </div>

      <div className="soli-chat-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
        <Section title="Outputs" count={outputs.length}>
          {outputs.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted">Plans, notices and drafts Lirava writes in this chat will appear here.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {outputs.map((a) => (
                <button key={a.id} type="button" onClick={() => setActiveArtifact(a.id)} className="group min-w-0 text-left" title={a.title}>
                  <span className="block h-[88px] overflow-hidden rounded-lg border border-border bg-card p-2 text-[9.5px] leading-[1.35] text-muted transition-colors group-hover:border-brand/50">
                    {preview(a.content, a.title)}
                  </span>
                  <span className="mt-1.5 block truncate text-[12.5px] text-foreground">{a.title}</span>
                  <span className="block truncate text-[11.5px] text-muted">{KIND_LABEL[a.kind] ?? "Document"}</span>
                </button>
              ))}
            </div>
          )}
        </Section>

        {matterId ? (
          <>
            <Section title="Case documents" count={documents?.length}>
              {documents === null ? (
                <p className="text-[12.5px] text-muted">Loading…</p>
              ) : documents.length === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-muted">No papers in this matter yet. Upload them from the matter page.</p>
              ) : (
                <ul className="space-y-1">
                  {documents.map((d) => (
                    <li key={d.id}>
                      <a
                        href={`/api/files/${encodeURIComponent(d.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-highlight"
                      >
                        <FileText className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{d.name}</span>
                        <span className="shrink-0 text-[11.5px] text-muted">
                          {d.status === "ready" ? `${d.pages} ${d.unit === "page" ? "pg" : "sec"}` : d.status === "no_text" ? "no text" : d.status}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Case knowledge tree" count={nodes === null ? undefined : treeCount}>
              {nodes === null ? (
                <p className="text-[12.5px] text-muted">Loading…</p>
              ) : failed ? (
                <p className="text-[12.5px] text-muted">The tree could not be loaded.</p>
              ) : tree.length === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-muted">The tree is empty. Build it from the matter page so chat answers can use it.</p>
              ) : (
                <div className="space-y-3">
                  {toConfirm > 0 && (
                    <p className="rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-muted">
                      {toConfirm} {toConfirm === 1 ? "item needs" : "items need"} your confirmation. Chat uses only confirmed items.
                    </p>
                  )}
                  {tree.map(({ section, items }) => (
                    <div key={section.id}>
                      <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted">
                        <Network className="size-3" /> {section.title}
                      </p>
                      <ul className="space-y-0.5">
                        {items.slice(0, 6).map((n) => (
                          <li key={n.id} className="flex items-start gap-2 rounded-md px-2 py-1" title={`${STATUS_TEXT[n.status]}${n.body ? ` · ${n.body}` : ""}`}>
                            <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${STATUS_DOT[n.status]}`} />
                            <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground">
                              {n.title}
                              {n.date ? <span className="text-muted"> · {n.date}</span> : null}
                            </span>
                          </li>
                        ))}
                        {items.length > 6 && <li className="px-2 text-[11.5px] text-muted">+{items.length - 6} more</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <Link href={`/matters/${encodeURIComponent(matterId)}`} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-readable hover:underline">
                Open the full tree <ExternalLink className="size-3" />
              </Link>
            </Section>
          </>
        ) : (
          <Section title="Case documents and tree">
            <p className="text-[12.5px] leading-relaxed text-muted">
              This chat is not in a matter. Start a chat from a matter to see its papers and case knowledge tree here.
            </p>
          </Section>
        )}

        <Section title="Used in this chat" count={sources.length} defaultOpen={sources.length > 0}>
          {sources.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted">Statutes, cases and papers behind Lirava&apos;s answers will be listed here.</p>
          ) : (
            <ul className="space-y-1">
              {sources.map((c, i) => (
                <li key={i}>
                  <button type="button" onClick={() => onOpenSource(c)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-highlight">
                    {c.kind === "document" ? <FileText className="size-4 shrink-0 text-muted" strokeWidth={1.75} /> : c.kind === "case" ? <Network className="size-4 shrink-0 text-muted" strokeWidth={1.75} /> : <BookOpen className="size-4 shrink-0 text-muted" strokeWidth={1.75} />}
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{c.kind === "document" ? c.name : c.title}</span>
                    <span className="shrink-0 text-[11.5px] text-muted">{c.kind === "document" ? `p. ${c.page}` : c.section ?? ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="flex items-center gap-1.5 pb-5 pt-2 text-[11.5px] text-muted">
          <ScrollText className="size-3.5" /> Check every source against the original before relying on it.
        </p>
      </div>
    </aside>
  );
}
