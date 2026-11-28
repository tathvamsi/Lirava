"use client";

import { useSyncExternalStore } from "react";
import type { CitationCheck, Conversation, DocumentArtifact, DocumentLanguage, Message, ServerEvent, Snapshot } from "./types";

// One client-side store fed by the server's event stream. Components read it with
// useSyncExternalStore; the EventSource opens on first subscription. No effects needed.

export type Toast = { id: number; vakilId: string; title: string; body: string };

export type State = Snapshot & {
  loaded: boolean;
  connected: boolean;
  screens: Record<string, number>; // vakilId -> timestamp of latest screenshot
  urls: Record<string, string>; // vakilId -> page its browser is on
  lastRead: Record<string, number>;
  toasts: Toast[];
  activeArtifactId: string | null;
  running: Record<string, "queued" | "running">;
  /** Saved width of the document preview beside a chat (pixels), or null for the default. */
  boardWidth: number | null;
  /** What the citation checker found in each answer, by message id. Live only: the API does not keep verdicts, so a reload clears them. */
  citationChecks: Record<string, CitationCheck>;
  /** The language the person wants documents written in, or null when they have not chosen (the assistant then asks). */
  documentLanguage: DocumentLanguage | null;
};

const EMPTY: State = {
  vakils: [], messages: [], artifacts: [], routines: [], triggers: [], rules: [], memories: [], skills: [], passwords: [],
  computer: { mode: "local", docker: false, image: "", model: "", models: [], computerTool: "", hasKey: true, keySource: null, cloudKey: null, openRouter: null, nvidia: null, groq: null, antigravity: null, triggersKey: null, sky: false, composio: false },
  apps: [],
  channels: [],
  conversations: [],
  loaded: false, connected: false, screens: {}, urls: {}, lastRead: {}, toasts: [],
  activeArtifactId: null,
  running: {},
  boardWidth: null,
  citationChecks: {},
  documentLanguage: null,
};

let state: State = EMPTY;
const listeners = new Set<() => void>();
let source: EventSource | null = null;
let toastSeq = 0;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

const upsert = <T extends { id: string }>(list: T[], item: T): T[] => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
};
const without = <T extends { id: string }>(list: T[], id: string) => list.filter((x) => x.id !== id);

export function activeVakilId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.location.pathname.match(/^\/vakil\/([^/?#]+)/)?.[1];
  return id ?? null;
}

// Saved settings live in PostgreSQL (not in this browser), so they follow the person to any device.
// Writes are batched: a burst of changes (dragging a panel, reading several chats) becomes one request.
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();
function savePreference(key: string, value: unknown) {
  clearTimeout(pendingSaves.get(key));
  pendingSaves.set(
    key,
    setTimeout(() => {
      pendingSaves.delete(key);
      void fetch(`/api/preferences/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      }).catch(() => undefined);
    }, 800),
  );
}

export function markRead(vakilId: string) {
  const lastRead = { ...state.lastRead, [vakilId]: Date.now() };
  set({ lastRead });
  savePreference("lastRead", lastRead);
}

export function setBoardWidthPreference(width: number) {
  set({ boardWidth: width });
  savePreference("artifactBoardWidth", width);
}

/** Saves the language documents are written in (null clears it, so the assistant asks again). */
export function setDocumentLanguage(language: DocumentLanguage | null) {
  set({ documentLanguage: language });
  savePreference("documentLanguage", language);
}

export function dismissToast(id: number) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function setActiveArtifact(id: string | null) {
  set({ activeArtifactId: id });
}

export function addArtifactLocally(artifact: DocumentArtifact) {
  set({
    artifacts: upsert(state.artifacts, artifact),
    activeArtifactId: artifact.id,
  });
}

/** Keeps an edited copy in the list without opening or switching the panel (a save finishing after it was closed). */
export function updateArtifactLocally(artifact: DocumentArtifact) {
  set({ artifacts: upsert(state.artifacts, artifact) });
}

/** Removes an artifact from the list (and closes the panel if it was open), the same as the server's "artifact_deleted" event. */
export function deleteArtifactLocally(id: string) {
  set({
    artifacts: without(state.artifacts, id),
    activeArtifactId: state.activeArtifactId === id ? null : state.activeArtifactId,
  });
}

export function deleteConversationLocally(id: string) {
  set({
    conversations: without(state.conversations, id),
    messages: state.messages.filter((m) => m.conversationId !== id),
  });
}

export function renameConversationLocally(id: string, title: string) {
  set({
    conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
  });
}

export function updateConversationFlagsLocally(id: string, flags: { pinned?: boolean; archived?: boolean }) {
  set({ conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...flags } : c)) });
}

export function updateConversationMatterLocally(id: string, matterId: string | null) {
  set({ conversations: state.conversations.map((c) => (c.id === id ? { ...c, matterId } : c)) });
}

export function addMessageLocally(message: Message) {
  set({ messages: upsert(state.messages, message) });
}

export function removeMessageLocally(id: string) {
  set({ messages: without(state.messages, id) });
}

export function addConversationLocally(conversation: Conversation & { userId?: string }) {
  set({ conversations: upsert(state.conversations, conversation) });
}

// A streamed answer arrives as hundreds of tiny pieces, and applying each one re-renders the whole message list, which froze
// the page for the length of a long answer. The pieces are gathered and applied about ten times a second instead.
const pendingDeltas = new Map<string, string>();
let deltaTimer: ReturnType<typeof setTimeout> | null = null;
function flushDeltas() {
  if (deltaTimer) clearTimeout(deltaTimer);
  deltaTimer = null;
  if (pendingDeltas.size === 0) return;
  const batch = new Map(pendingDeltas);
  pendingDeltas.clear();
  set({ messages: state.messages.map((m): Message => (batch.has(m.id) ? { ...m, text: m.text + batch.get(m.id) } : m)) });
}

function apply(ev: ServerEvent) {
  // Any other event may read or replace message text, so the gathered pieces are applied first and in order.
  if (ev.type !== "message_delta") flushDeltas();
  switch (ev.type) {
    case "snapshot": {
      const lastRead = { ...(ev.data.preferences?.lastRead ?? {}) };
      for (const d of ev.data.vakils) lastRead[d.id] ??= Date.now();
      set({
        ...ev.data,
        running: ev.data.running ?? {},
        boardWidth: ev.data.preferences?.artifactBoardWidth ?? null,
        documentLanguage: ev.data.preferences?.documentLanguage ?? null,
        loaded: true,
        connected: true,
        lastRead,
      });
      return;
    }
    case "vakil":
      return set({ vakils: upsert(state.vakils, ev.data) });
    case "vakil_deleted":
      return set({ vakils: without(state.vakils, ev.id), messages: state.messages.filter((m) => m.vakilId !== ev.id) });
    case "message": {
      set({ messages: upsert(state.messages, ev.data) });
      if (ev.data.vakilId === activeVakilId() && document.visibilityState === "visible") markRead(ev.data.vakilId);
      return;
    }
    case "run_status": {
      const running = { ...state.running };
      if (ev.data.status === "idle") delete running[ev.conversationId];
      else running[ev.conversationId] = ev.data.status;
      return set({ running });
    }
    case "message_delta": {
      pendingDeltas.set(ev.id, (pendingDeltas.get(ev.id) ?? "") + ev.delta);
      if (!deltaTimer) deltaTimer = setTimeout(flushDeltas, 100);
      return;
    }
    case "artifact":
      return set({
        artifacts: upsert(state.artifacts, ev.data),
        activeArtifactId: ev.data.id,
      });
    case "artifact_deleted":
      return set({
        artifacts: without(state.artifacts, ev.id),
        activeArtifactId: state.activeArtifactId === ev.id ? null : state.activeArtifactId,
      });
    case "routine":
      return set({ routines: upsert(state.routines, ev.data) });
    case "routine_deleted":
      return set({ routines: without(state.routines, ev.id) });
    case "trigger":
      return set({ triggers: upsert(state.triggers, ev.data) });
    case "trigger_deleted":
      return set({ triggers: without(state.triggers, ev.id) });
    case "rule":
      return set({ rules: upsert(state.rules, ev.data) });
    case "rule_deleted":
      return set({ rules: without(state.rules, ev.id) });
    case "memory":
      return set({ memories: upsert(state.memories, ev.data) });
    case "memory_deleted":
      return set({ memories: without(state.memories, ev.id) });
    case "skill":
      return set({ skills: upsert(state.skills, ev.data) });
    case "skill_deleted":
      return set({ skills: without(state.skills, ev.id) });
    case "password":
      return set({ passwords: upsert(state.passwords, ev.data) });
    case "password_deleted":
      return set({ passwords: without(state.passwords, ev.id) });
    case "screen":
      return set({ screens: { ...state.screens, [ev.vakilId]: ev.at } });
    case "browser_url":
      return set({ urls: { ...state.urls, [ev.vakilId]: ev.url } });
    case "notify":
      return notify(ev.vakilId, ev.title, ev.body);
    case "computer":
      return set({ computer: ev.data });
    case "composio":
      return set({ apps: ev.data });
    case "channel":
      return set({ channels: upsert(state.channels, ev.data) });
    case "conversation":
      return set({ conversations: upsert(state.conversations, ev.data) });
    case "conversation_deleted":
      return set({ conversations: without(state.conversations, ev.id), messages: state.messages.filter((m) => m.conversationId !== ev.id) });
    case "channel_deleted":
      return set({ channels: without(state.channels, ev.id), messages: state.messages.filter((m) => m.channelId !== ev.id) });
    case "citation_check":
      return set({ citationChecks: { ...state.citationChecks, [ev.data.messageId]: ev.data } });
  }
}

function notify(vakilId: string, title: string, body: string) {
  const watching = activeVakilId() === vakilId && document.visibilityState === "visible" && document.hasFocus();
  if (watching) return;
  if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
    const n = new Notification(title, { body, tag: vakilId });
    n.onclick = () => {
      window.focus();
      // Native notification click runs outside React, so there is no router here.
      const canonicalId = vakilId;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/vakil/${canonicalId}`;
    };
  }
  const toast = { id: ++toastSeq, vakilId, title, body };
  set({ toasts: [...state.toasts.slice(-3), toast] });
  setTimeout(() => dismissToast(toast.id), 7000);
}

let lastEventAt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function connect() {
  source = new EventSource("/api/events");
  source.onopen = () => {
    reconnectAttempts = 0;
  };
  source.onmessage = (e) => {
    lastEventAt = Date.now();
    if (!e.data || e.data.startsWith(":") || e.data.trim() === "ping") return;
    try {
      apply(JSON.parse(e.data) as ServerEvent);
    } catch {
      // Ignore keep-alive or malformed frames gracefully
    }
  };
  source.onerror = () => {
    set({ connected: false });
    // While the browser is still retrying, a fresh snapshot follows by itself. But when the server answered with an error
    // (the proxy returns 502 for a moment when the API is unreachable) the browser gives up for good, and the page would
    // never hear another answer until it was reloaded. So it is opened again here, waiting a little longer each time.
    if (source?.readyState !== EventSource.CLOSED || reconnectTimer) return;
    source = null;
    const wait = Math.min(30_000, 1000 * 2 ** reconnectAttempts++);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!source && listeners.size > 0) connect();
    }, wait);
  };
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  reconnectAttempts = 0;
  source?.close();
  source = null;
}

/**
 * Makes sure an answer that is being waited for shows up even when the live stream does not carry it (the stream is down,
 * or the answer was produced by another server instance than the one holding the stream). While the stream is silent, the
 * saved chat is read every few seconds; the answer is saved in one piece when it is finished, so finding a reply after
 * the question means the run is over. Returns a function that stops watching.
 */
export function watchAnswer(conversationId: string, questionId: string): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const startedAt = Date.now();
  const tick = async () => {
    if (stopped) return;
    // Anything arriving on the stream (text, status) means it is working: leave it alone.
    const streamQuiet = Date.now() - lastEventAt > 6000;
    if (streamQuiet && document.visibilityState === "visible") {
      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, { cache: "no-store" });
        if (stopped) return;
        if (res.ok) {
          const saved = ((await res.json()) as { messages?: Message[] }).messages ?? [];
          const at = saved.findIndex((m) => m.id === questionId);
          const replies = at === -1 ? [] : saved.slice(at + 1).filter((m) => m.role !== "user");
          if (replies.length > 0) {
            flushDeltas();
            let messages = state.messages;
            for (const m of saved) messages = upsert(messages, m);
            const running = { ...state.running };
            delete running[conversationId];
            set({ messages, running });
            return;
          }
        }
      } catch {
        // A network blip: try again on the next round.
      }
    }
    if (stopped || Date.now() - startedAt > 10 * 60_000) return;
    timer = setTimeout(tick, 3000);
  };
  timer = setTimeout(tick, 4000);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

/**
 * Log the client out locally: close the event stream, drop every cached vakil,
 * chat, and config, and forget read receipts — so the next account to sign in
 * on this browser starts from zero and never sees the previous user's data.
 */
export function resetStore() {
  disconnect();
  for (const timer of pendingSaves.values()) clearTimeout(timer);
  pendingSaves.clear();
  state = EMPTY;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!source) connect();
  return () => listeners.delete(listener);
}

/** Merge older messages (e.g. a conversation's full history, loaded on open) into the store. */
export function mergeMessages(list: Message[]) {
  if (!list.length) return;
  const known = new Set(state.messages.map((m) => m.id));
  const extra = list.filter((m) => !known.has(m.id));
  if (extra.length) set({ messages: [...extra, ...state.messages].sort((a, b) => a.createdAt - b.createdAt) });
}

/** Current state, for code outside React. */
export function getState(): State {
  return state;
}

/** Select a slice of state. Return existing references (not new arrays) to avoid re-render loops. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(EMPTY));
}
