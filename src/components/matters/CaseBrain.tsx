"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileText, Link2, Network, Plus, Sparkles, Trash2, X } from "lucide-react";
import { addCaseNode, deleteCaseNode, editCaseNode, importCaseNodesFromPapers, listCaseNodes } from "@/app/actions";
import type { CaseNode, CaseNodeInput, CaseNodeKind, CaseNodeRelation, CaseNodeStatus } from "@/lib/types";

const KIND_LABEL: Record<CaseNodeKind, string> = {
  section: "Section",
  party: "Party",
  fact: "Fact",
  event: "Event",
  issue: "Issue",
  law: "Law",
  argument: "Argument",
  evidence: "Evidence",
  question: "Question",
  note: "Note",
};

/** What a lawyer is most likely adding under each starting section. */
const KINDS_FOR: Record<string, CaseNodeKind[]> = {
  Parties: ["party", "note"],
  Facts: ["fact", "note"],
  Chronology: ["event", "note"],
  Issues: ["issue", "note"],
  "Law and authorities": ["law", "note"],
  Arguments: ["argument", "note"],
  "Evidence and documents": ["evidence", "note"],
  "Open questions": ["question", "note"],
};

const STATUS_STYLE: Record<CaseNodeStatus, string> = {
  proposed: "bg-amber-500/10 text-amber-300",
  confirmed: "bg-emerald-500/10 text-emerald-300",
  disputed: "bg-red-500/10 text-red-300",
};

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * The matter's case knowledge tree: the lawyer adds facts, issues, law and arguments under the standard sections, links them
 * (supports, contradicts, cites), and confirms or disputes what was read from the papers.
 */
export default function CaseBrain({ matterId }: { matterId: string }) {
  const [nodes, setNodes] = useState<CaseNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | CaseNodeStatus>("all");

  const load = useCallback(async () => {
    try {
      setNodes(await listCaseNodes(matterId));
      setError(null);
    } catch {
      setError("We could not load the case tree. Please refresh the page.");
    }
  }, [matterId]);

  useEffect(() => {
    if (matterId) void load();
  }, [load, matterId]);

  const byId = useMemo(() => new Map((nodes ?? []).map((n) => [n.id, n])), [nodes]);
  const sections = (nodes ?? []).filter((n) => n.kind === "section");
  const childrenOf = (id: string) => (nodes ?? []).filter((n) => n.parentId === id);
  const proposed = (nodes ?? []).filter((n) => n.status === "proposed").length;

  async function run<T>(work: () => Promise<T>, failure: string): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await work();
    } catch {
      setError(failure);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const replace = (next: CaseNode) => setNodes((cur) => (cur ?? []).map((n) => (n.id === next.id ? next : n)));

  async function readPapers() {
    const result = await run(() => importCaseNodesFromPapers(matterId), "We could not read the papers into the tree. Please try again.");
    if (!result) return;
    setNodes(result.nodes);
    setNote(result.added ? `${result.added} item${result.added === 1 ? "" : "s"} added from the papers. Confirm or dispute each one.` : "Nothing new to add. Add items yourself, or upload papers so the case file can read them.");
  }

  return (
    <section aria-label="Case tree" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl tracking-[-0.03em]">
            <Network className="size-5 text-brand" /> Case tree
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-foreground/55">
            Build what you know about this case: facts, issues, law and arguments, and how they connect.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="field h-9 text-[12px]">
            <option value="all">All items</option>
            <option value="proposed">To review{proposed ? ` (${proposed})` : ""}</option>
            <option value="confirmed">Confirmed</option>
            <option value="disputed">Disputed</option>
          </select>
          <button type="button" disabled={busy} onClick={() => void readPapers()} className="btn-secondary inline-flex h-9 items-center gap-2 px-3 text-[12px]">
            <Sparkles className="size-3.5" /> Read from papers
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-[13px] text-red-300">{error}</p>}
      {note && <p role="status" className="mt-4 rounded-xl bg-highlight px-4 py-3 text-[13px] text-foreground/80">{note}</p>}
      {nodes === null && !error && <p role="status" className="mt-6 text-[13px] text-foreground/55">Loading the case tree…</p>}

      <div className="mt-5 grid gap-3">
        {sections.map((section) => {
          const items = childrenOf(section.id).filter((n) => filter === "all" || n.status === filter);
          const open = !closed.has(section.id);
          return (
            <div key={section.id} className="surface p-4">
              <button
                type="button"
                onClick={() =>
                  setClosed((cur) => {
                    const next = new Set(cur);
                    if (next.has(section.id)) next.delete(section.id);
                    else next.add(section.id);
                    return next;
                  })
                }
                className="flex w-full items-center gap-2 text-left"
                aria-expanded={open}
              >
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span className="font-serif text-lg">{section.title}</span>
                <span className="ml-auto text-[12px] text-foreground/45">{childrenOf(section.id).length}</span>
              </button>
              {open && (
                <div className="mt-3 space-y-2">
                  {items.map((node) => (
                    <NodeRow
                      key={node.id}
                      node={node}
                      all={nodes ?? []}
                      byId={byId}
                      busy={busy}
                      onChange={async (input) => {
                        const next = await run(() => editCaseNode(matterId, node.id, input), "We could not save that change.");
                        if (next) replace(next);
                      }}
                      onDelete={async () => {
                        const next = await run(() => deleteCaseNode(matterId, node.id), "We could not delete that item.");
                        if (next) setNodes(next);
                      }}
                    />
                  ))}
                  {items.length === 0 && <p className="text-[12px] text-foreground/45">{filter === "all" ? "Nothing here yet." : "Nothing matches this filter."}</p>}
                  <AddNode
                    kinds={KINDS_FOR[section.title] ?? ["note"]}
                    busy={busy}
                    onAdd={async (input) => {
                      const next = await run(() => addCaseNode(matterId, { ...input, parentId: section.id }), "We could not add that item.");
                      if (next) setNodes((cur) => [...(cur ?? []), next]);
                      return Boolean(next);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NodeRow({
  node,
  all,
  byId,
  busy,
  onChange,
  onDelete,
}: {
  node: CaseNode;
  all: CaseNode[];
  byId: Map<string, CaseNode>;
  busy: boolean;
  onChange: (input: CaseNodeInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [body, setBody] = useState(node.body);
  const [linkTo, setLinkTo] = useState("");
  const [relation, setRelation] = useState<CaseNodeRelation>("supports");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const targets = all.filter((n) => n.kind !== "section" && n.id !== node.id);

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="mr-2 text-[11px] uppercase tracking-wide text-foreground/40">{KIND_LABEL[node.kind]}</span>
          {node.date && <span className="mr-2 text-[12px] text-foreground/55">{formatDate(node.date)}</span>}
          <span className="text-[14px] text-foreground">{node.title}</span>
        </button>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[node.status]}`}>{node.status}</span>
      </div>

      {node.links.length > 0 && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-foreground/55">
          <Link2 className="size-3.5" />
          {node.links.map((l) => (
            <span key={`${l.to}-${l.relation}`} className="inline-flex items-center gap-1">
              {l.relation} <em className="not-italic text-foreground/75">{byId.get(l.to)?.title ?? "(removed)"}</em>
              <button type="button" aria-label="Remove link" disabled={busy} onClick={() => void onChange({ links: node.links.filter((x) => x !== l) })} className="text-foreground/35 hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3 text-[13px]">
          {editing ? (
            <div className="grid gap-2">
              <input className="field h-9 w-full" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
              <textarea className="field min-h-20 w-full py-2" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Details" placeholder="Details" />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !title.trim()}
                  onClick={async () => {
                    await onChange({ title, body });
                    setEditing(false);
                  }}
                  className="btn-primary h-8 px-3 text-[12px]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(node.title);
                    setBody(node.body);
                    setEditing(false);
                  }}
                  className="btn-quiet h-8 px-3 text-[12px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            node.body && <p className="whitespace-pre-wrap text-foreground/75">{node.body}</p>
          )}

          {node.sources.map((s, i) => (
            <blockquote key={i} className="border-l-2 border-border pl-3 text-foreground/65">
              {s.quote && <p>“{s.quote}”</p>}
              <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-foreground/45">
                <FileText className="size-3" />
                {s.name ?? "Document"}
                {s.page ? `, page ${s.page}` : ""}
              </p>
            </blockquote>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            {node.status !== "confirmed" && (
              <button type="button" disabled={busy} onClick={() => void onChange({ status: "confirmed" })} className="btn-secondary inline-flex h-8 items-center gap-1 px-3 text-[12px]">
                <Check className="size-3.5" />
                Confirm
              </button>
            )}
            {node.status !== "disputed" && (
              <button type="button" disabled={busy} onClick={() => void onChange({ status: "disputed" })} className="btn-quiet h-8 px-3 text-[12px]">
                Dispute
              </button>
            )}
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="btn-quiet h-8 px-3 text-[12px]">
                Edit
              </button>
            )}
            {confirmDelete ? (
              <span className="inline-flex items-center gap-2 text-[12px] text-red-300">
                Delete this and anything under it?
                <button type="button" disabled={busy} onClick={() => void onDelete()} className="rounded-md bg-red-500/90 px-2 py-1 text-white">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="btn-quiet px-2 py-1">
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn-quiet inline-flex h-8 items-center gap-1 px-3 text-[12px] text-red-300">
                <Trash2 className="size-3.5" />
                Delete
              </button>
            )}
          </div>

          {targets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Relation" className="field h-8 text-[12px]" value={relation} onChange={(e) => setRelation(e.target.value as CaseNodeRelation)}>
                <option value="supports">supports</option>
                <option value="contradicts">contradicts</option>
                <option value="cites">cites</option>
              </select>
              <select aria-label="Link to" className="field h-8 max-w-64 text-[12px]" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                <option value="">Link to…</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {KIND_LABEL[t.kind]}: {t.title.slice(0, 60)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !linkTo}
                onClick={async () => {
                  await onChange({ links: [...node.links, { to: linkTo, relation }] });
                  setLinkTo("");
                }}
                className="btn-secondary h-8 px-3 text-[12px]"
              >
                Add link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddNode({
  kinds,
  busy,
  onAdd,
}: {
  kinds: CaseNodeKind[];
  busy: boolean;
  onAdd: (input: CaseNodeInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CaseNodeKind>(kinds[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-quiet inline-flex h-8 items-center gap-1.5 px-2 text-[12px]">
        <Plus className="size-3.5" /> Add
      </button>
    );
  }
  return (
    <form
      className="grid gap-2 rounded-lg border border-dashed border-border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const ok = await onAdd({ kind, title, body, date: kind === "event" && date ? date : null });
        if (ok) {
          setTitle("");
          setBody("");
          setDate("");
          setOpen(false);
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        {kinds.length > 1 && (
          <select aria-label="Kind" className="field h-9 text-[12px]" value={kind} onChange={(e) => setKind(e.target.value as CaseNodeKind)}>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        )}
        <input autoFocus className="field h-9 min-w-0 flex-1" placeholder={`${KIND_LABEL[kind]}: say it in one line`} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        {kind === "event" && <input type="date" className="field h-9" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />}
      </div>
      <textarea className="field min-h-16 w-full py-2" placeholder="Details, if any" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Details" />
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !title.trim()} className="btn-primary h-8 px-3 text-[12px]">
          Add to tree
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-quiet h-8 px-3 text-[12px]">
          Cancel
        </button>
      </div>
    </form>
  );
}
