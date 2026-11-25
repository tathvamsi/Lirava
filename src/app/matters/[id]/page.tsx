"use client";

import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  FolderKanban,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import {
  answerCheckpoint,
  createMatterChat,
  deleteConversation,
  deleteMatterForever,
  setMatterArchived,
  getMatterFile,
  listMatterConversations,
  listMatters,
  moveConversationToMatter,
  setConversationFlags,
} from "@/app/actions";
import type { Conversation, Matter, MatterEvent } from "@/lib/types";
import CaseFile from "@/components/matters/CaseFile";
import CaseBrain from "@/components/matters/CaseBrain";
import KnowledgePicker from "@/components/knowledge/KnowledgePicker";
import {
  deleteConversationLocally,
  updateConversationFlagsLocally,
  updateConversationMatterLocally,
  useStore,
} from "@/lib/store";

type MatterDocument = { id: string; name: string; status: "ready" | "no_text" | "unsupported" | "failed"; pages: number; unit: "page" | "section"; note: string | null };

const STATUS_LABEL: Record<MatterDocument["status"], string> = {
  ready: "Searchable",
  no_text: "Scanned: no text found",
  unsupported: "Stored, not searchable",
  failed: "Could not be read",
};

export default function MatterWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [matterId, setMatterId] = useState("");
  const [matter, setMatter] = useState<Matter | null>(null);
  const [allMatters, setAllMatters] = useState<Matter[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [creating, setCreating] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();
  const [documents, setDocuments] = useState<MatterDocument[]>([]);
  const firstVakil = useStore((state) => state.vakils[0]);
  const storeConversations = useStore((state) => state.conversations);
  const [events, setEvents] = useState<MatterEvent[]>([]);
  const justHanded = useSearchParams().get("handed") === "1";

  useEffect(() => {
    void params.then(({ id }) => {
      setMatterId(id);
      void fetch(`/api/documents?matterId=${encodeURIComponent(id)}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : { documents: [] }))
        .then((data: { documents?: MatterDocument[] }) => setDocuments(data.documents ?? []))
        .catch(() => setDocuments([]));
      Promise.all([listMatters(), listMatterConversations(id), getMatterFile(id).catch(() => null)])
        .then(([matters, chats, file]) => {
          setAllMatters(matters);
          setMatter(file?.matter ?? matters.find((item) => item.id === id) ?? null);
          setEvents(file?.events ?? []);
          setConversations(chats);
          setState("ready");
        })
        .catch(() => setState("error"));
    });
  }, [params]);

  // Counsel works in the chats, so the case file is refreshed while the page is open.
  useEffect(() => {
    if (!matterId) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void getMatterFile(matterId).then((file) => {
        if (!active || !file) return;
        setMatter(file.matter);
        setEvents(file.events);
      }).catch(() => undefined);
    };
    const timer = window.setInterval(refresh, 8000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [matterId]);

  const chatHref = (conversationId: string) => {
    const chat = storeConversations.find((item) => item.id === conversationId) ?? conversations.find((item) => item.id === conversationId);
    return chat ? `/vakil/${chat.vakilId}?c=${encodeURIComponent(chat.id)}&matter=${encodeURIComponent(matterId)}` : null;
  };

  /** Resolves a checkpoint; returns a message when it could not be saved. */
  async function answer(eventId: string, resolution: "approved" | "changes", note: string): Promise<string | null> {
    try {
      const next = await answerCheckpoint(matterId, eventId, resolution, note);
      setEvents(next);
      const file = await getMatterFile(matterId).catch(() => null);
      if (file) setMatter(file.matter);
      return null;
    } catch {
      return "We could not save that. Please try again.";
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleMatterArchive() {
    if (!matter || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      setMatter(await setMatterArchived(matterId, matter.status !== "Archived"));
    } catch {
      setActionError("We could not update the matter. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMatter() {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteMatterForever(matterId);
      router.push("/matters");
    } catch {
      setActionError("We could not delete the matter. Please try again.");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  async function newChat() {
    if (!matterId || !firstVakil || creating) return;
    setCreating(true);
    setActionError(null);
    try {
      const conversation = await createMatterChat(matterId, firstVakil.id);
      router.push(`/vakil/${firstVakil.id}?c=${encodeURIComponent(conversation.id)}&matter=${encodeURIComponent(matterId)}`);
    } catch {
      setActionError("We could not start a new chat. Please try again.");
      setCreating(false);
    }
  }

  // Archived is stored with the chat itself, in PostgreSQL.
  const archivedIds = conversations.filter((chat) => chat.archived).map((chat) => chat.id);

  function toggleArchive(id: string) {
    const on = !archivedIds.includes(id);
    const apply = (value: boolean) => {
      setConversations((current) => current.map((chat) => (chat.id === id ? { ...chat, archived: value } : chat)));
      updateConversationFlagsLocally(id, { archived: value });
    };
    apply(on);
    setConversationFlags(id, { archived: on }).catch(() => {
      apply(!on);
      setActionError("We could not update that chat. Please try again.");
    });
  }

  async function removeChat(conversation: Conversation) {
    if (!window.confirm(`Delete “${conversation.title || "Untitled chat"}”?`))
      return;
    try {
      await deleteConversation(conversation.id);
    } catch {
      setActionError("We could not delete that chat. Please try again.");
      return;
    }
    deleteConversationLocally(conversation.id);
    setConversations((current) =>
      current.filter((item) => item.id !== conversation.id),
    );
  }

  async function moveChat(
    conversation: Conversation,
    targetMatterId: string | null,
  ) {
    try {
      await moveConversationToMatter(conversation.id, targetMatterId);
    } catch {
      setActionError("We could not move that chat. Please try again.");
      setMovingId(null);
      return;
    }
    updateConversationMatterLocally(conversation.id, targetMatterId);
    setMovingId(null);
    if (targetMatterId !== matterId)
      setConversations((current) =>
        current.filter((item) => item.id !== conversation.id),
      );
  }

  if (state === "loading")
    return (
      <div role="status" className="mx-auto max-w-5xl px-5 py-12 text-foreground/60">
        Loading matter workspace…
      </div>
    );

  if (state === "error" || !matter)
    return (
      <div className="mx-auto max-w-5xl px-5 py-12">
        <Link href="/matters" className="inline-flex items-center gap-2 text-[13px] text-foreground/55 hover:text-foreground">
          <ArrowLeft className="size-4" />
          All matters
        </Link>
        <p role="alert" className="mt-8 text-[15px] text-foreground/70">
          {state === "error" ? "We could not load this matter. Please refresh the page." : "This matter was not found."}
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link
        href="/matters"
        className="inline-flex items-center gap-2 text-[13px] text-foreground/55 hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All matters
      </Link>
      <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-serif text-4xl tracking-[-0.04em] text-foreground">
            {matter.title}
          </h1>
          <p className="mt-2 text-[14px] text-foreground/55">
            {matter.client || "No client recorded"}, {" "}
            {matter.court || "Court not recorded"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {confirmDelete ? (
            <span className="flex items-center gap-2 rounded-lg border border-red-400/40 px-3 py-1.5 text-[12px] text-foreground/80">
              Delete this matter, its papers and timeline? Chats are kept.
              <button type="button" disabled={busy} onClick={() => void removeMatter()} className="rounded-md bg-red-500/90 px-2.5 py-1 text-white disabled:opacity-60">
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-quiet px-2 py-1">Cancel</button>
            </span>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void toggleMatterArchive()} className="btn-quiet inline-flex h-10 items-center gap-2 px-3 text-[13px]">
                <Archive className="size-4" />
                {matter.status === "Archived" ? "Restore" : "Archive"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn-quiet inline-flex h-10 items-center gap-2 px-3 text-[13px] text-red-300">
                <Trash2 className="size-4" />
                Delete
              </button>
            </>
          )}
          <KnowledgePicker scope="matter" id={matterId} placement="down" />
          <button
            type="button"
            onClick={() => void newChat()}
            disabled={!firstVakil || creating}
            className="btn-primary inline-flex h-10 items-center justify-center gap-2 px-4 text-[13px]"
          >
            <Plus className="size-4" />
            {creating ? "Creating…" : "New chat"}
          </button>
        </div>
      </div>
      {justHanded && (
        <p role="status" className="mt-6 rounded-xl bg-highlight px-4 py-3 text-[14px] text-foreground/85">
          Your case has been handed over. Counsel is reading your brief and will post updates below.
        </p>
      )}
      <CaseFile matter={matter} events={events} chatHref={chatHref} onAnswer={answer} />
      <CaseBrain matterId={matterId} />
      {actionError && (
        <p role="alert" className="mt-6 text-[13px] text-red-300">
          {actionError}
        </p>
      )}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Chats in this matter</h2>
          <span className="text-[12px] text-foreground/45">
            {conversations.length}{" "}
            {conversations.length === 1 ? "chat" : "chats"}
          </span>
        </div>
        {conversations.length === 0 ? (
          <div className="surface mt-5 flex min-h-52 flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="size-6 text-brand" />
            <p className="mt-4 font-serif text-xl">
              Start the first matter chat
            </p>
            <p className="mt-2 text-[13px] text-foreground/50">
              Keep research, drafting, and follow-up conversations together
              here.
            </p>
            <button
              type="button"
              onClick={() => void newChat()}
              className="btn-secondary mt-5 h-9 px-4 text-[13px]"
            >
              Create chat
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {conversations.map((conversation) => (
              <article
                key={conversation.id}
                className="surface p-5 transition-colors hover:border-brand/40"
              >
                <Link
                  href={`/vakil/${conversation.vakilId}?c=${encodeURIComponent(conversation.id)}&matter=${encodeURIComponent(matter.id)}`}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-serif text-lg text-foreground">
                      {conversation.title || "Untitled chat"}
                    </p>
                    <MessageSquare className="size-4 shrink-0 text-brand" />
                  </div>
                  <p className="mt-3 text-[12px] text-foreground/45">
                    Updated {new Date(conversation.updatedAt).toLocaleString()}
                  </p>
                </Link>
                <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => toggleArchive(conversation.id)}
                    className="btn-quiet inline-flex h-8 items-center gap-1.5 px-2 text-[12px]"
                    title={
                      archivedIds.includes(conversation.id)
                        ? "Unarchive"
                        : "Archive"
                    }
                  >
                    <Archive className="size-3.5" />
                    {archivedIds.includes(conversation.id)
                      ? "Unarchive"
                      : "Archive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovingId(conversation.id)}
                    className="btn-quiet inline-flex h-8 items-center gap-1.5 px-2 text-[12px]"
                    title="Move to another matter"
                  >
                    <FolderKanban className="size-3.5" />
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeChat(conversation)}
                    className="btn-quiet ml-auto inline-flex h-8 items-center gap-1.5 px-2 text-[12px] text-red-300 hover:text-red-200"
                    title="Delete chat"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Documents in this matter</h2>
          <span className="text-[12px] text-foreground/45">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>
        {documents.length === 0 ? (
          <p className="mt-4 text-[13px] text-foreground/50">
            Attach a file in any chat of this matter. Lirava reads it page by page and can answer from it in every chat here, citing the page.
          </p>
        ) : (
          <ul className="mt-5 grid gap-2">
            {documents.map((document) => (
              <li key={document.id} className="surface flex items-center gap-3 p-3.5">
                <FileText className="size-4 shrink-0 text-foreground/45" strokeWidth={1.75} />
                <a
                  href={`/api/files/${encodeURIComponent(document.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-[14px] hover:underline"
                >
                  {document.name}
                </a>
                <span className="shrink-0 text-[12px] text-foreground/50" title={document.note ?? undefined}>
                  {document.status === "ready" ? `${document.pages} ${document.unit === "page" ? "pages" : "sections"} · ` : ""}
                  {STATUS_LABEL[document.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {movingId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setMovingId(null)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-4">
            <h2 className="font-serif text-xl">Move chat to matter</h2>
            <div className="mt-4 space-y-1">
              {allMatters
                .filter((item) => item.id !== matterId)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { const chat = conversations.find((conversation) => conversation.id === movingId); if (chat) void moveChat(chat, item.id); }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-highlight"
                  >
                    {item.title}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => { const chat = conversations.find((conversation) => conversation.id === movingId); if (chat) void moveChat(chat, null); }}
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground/60 hover:bg-highlight"
              >
                Remove from matter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
