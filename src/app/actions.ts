"use server";

import { requireUser } from "@/lib/auth";
import { buildConversationTitle } from "@/lib/conversation-title";
import type { Attachment, CaseNodeInput, MatterIntake } from "@/lib/types";
import {
  createCaseNode,
  fetchCaseNodes,
  importCaseNodes,
  removeCaseNode,
  updateCaseNode,
  backendFetch,
  createBackendConversation,
  sendVakilMessage,
  createBackendMatter,
  deleteBackendMatter,
  setBackendMatterStatus,
  fetchMatters,
  fetchMatterFile,
  resolveBackendCheckpoint,
  fetchConversations,
  fetchConversation,
} from "@/lib/backend-client";

/**
 * Every action runs as the signed-in user. The backend identifies that user from the
 * session token the client forwards, never from the arguments below.
 */
async function caller() {
  return requireUser();
}

// ---------- Matters ----------

export async function listMatters() {
  const user = await caller();
  return fetchMatters(user.id);
}

export async function createMatter(input: { title: string; client?: string; court?: string; nextDate?: string; notes?: string }) {
  const user = await caller();
  return createBackendMatter({ ...input, userId: user.id });
}

/** Hands a case to counsel: the matter is created with the brief, and the timeline starts. */
export async function handOverCase(input: { title: string; client?: string; court?: string; intake: MatterIntake }) {
  const user = await caller();
  return createBackendMatter({ ...input, nextDate: input.intake.deadline || undefined, notes: input.intake.brief, userId: user.id });
}

/** A matter with its timeline of stages, notes, checkpoints and deliverables. */
export async function getMatterFile(matterId: string) {
  await caller();
  return fetchMatterFile(matterId);
}

// ---------- Case knowledge tree ----------

export async function listCaseNodes(matterId: string) {
  await caller();
  return fetchCaseNodes(matterId);
}

export async function addCaseNode(matterId: string, input: CaseNodeInput) {
  await caller();
  return createCaseNode(matterId, input);
}

export async function editCaseNode(matterId: string, nodeId: string, input: CaseNodeInput) {
  await caller();
  return updateCaseNode(matterId, nodeId, input);
}

export async function deleteCaseNode(matterId: string, nodeId: string) {
  await caller();
  return removeCaseNode(matterId, nodeId);
}

/** Pulls what the papers say into the tree as proposed nodes to confirm. */
export async function importCaseNodesFromPapers(matterId: string) {
  await caller();
  return importCaseNodes(matterId);
}

/** Archives a matter (hidden from the main list, can be restored) or brings it back. */
export async function setMatterArchived(matterId: string, archived: boolean) {
  await caller();
  return setBackendMatterStatus(matterId, archived ? "archived" : "active");
}

/** Deletes a matter for good, with its timeline, case file and papers. Its chats are kept. */
export async function deleteMatterForever(matterId: string) {
  await caller();
  await deleteBackendMatter(matterId);
}

export async function answerCheckpoint(matterId: string, eventId: string, resolution: "approved" | "changes", note: string) {
  await caller();
  return resolveBackendCheckpoint(matterId, eventId, resolution, note);
}

export async function listMatterConversations(matterId: string) {
  const user = await caller();
  return (await fetchConversations(user.id)).filter((conversation) => conversation.matterId === matterId);
}

export async function createMatterChat(matterId: string, vakilId: string) {
  const user = await caller();
  return createBackendConversation(vakilId, "New matter chat", user.id, undefined, matterId);
}

// ---------- Chats ----------

const GENERIC_TITLES = new Set(["", "New matter chat", "New consultation", "New Legal Consultation", "Untitled Conversation"]);

/** Gives chats that still carry a placeholder title a name taken from their first question. */
export async function backfillConversationTitles() {
  const user = await caller();
  const conversations = await fetchConversations(user.id);
  // Only chats with a placeholder title are opened, and at most a handful per visit. They are independent, so they
  // are handled at the same time instead of one after the other.
  const results = await Promise.all(
    conversations
      .filter((c) => GENERIC_TITLES.has(c.title))
      .slice(0, 10)
      .map(async (conversation) => {
        const data = await fetchConversation(conversation.id);
        const firstUserMessage = data?.messages.find((message) => message.role === "user" && message.text.trim());
        if (!firstUserMessage) return null;
        const title = buildConversationTitle(firstUserMessage.text);
        if (title === conversation.title) return null;
        await renameConversation(conversation.id, title);
        return { id: conversation.id, title };
      }),
  );
  return results.filter((r): r is { id: string; title: string } => r !== null);
}

export async function sendMessage(
  vakilId: string,
  text: string,
  attachments: Attachment[] = [],
  conversationId?: string,
  messageId?: string,
  provider?: string,
) {
  if (!text.trim() && !attachments.length) return;
  const user = await caller();

  // In the background: the question is saved and this returns at once. The answer streams in as it is written.
  const res = await sendVakilMessage(vakilId, text.trim(), user.id, conversationId, messageId, attachments, true, provider);
  return {
    userMessage: res?.userMessage,
    assistantMessage: res?.assistantMessage,
    conversationId: res?.userMessage?.conversationId || conversationId,
  };
}

export async function startConversation(
  vakilId: string,
  text: string,
  attachments: Attachment[] = [],
  customConvId?: string,
  messageId?: string,
  matterId?: string,
  provider?: string,
) {
  const user = await caller();
  const conv = await createBackendConversation(
    vakilId,
    buildConversationTitle(text),
    user.id,
    customConvId,
    matterId
  );
  const res = await sendVakilMessage(vakilId, text.trim(), user.id, conv.id, messageId, attachments, true, provider);
  return {
    conversationId: conv.id,
    conversation: conv,
    userMessage: res?.userMessage,
    assistantMessage: res?.assistantMessage,
  };
}

export async function renameConversation(convId: string, title: string) {
  await caller();
  await backendFetch(`/api/conversations/${encodeURIComponent(convId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title: title.trim() }),
  });
}

/** Pin or archive one of the user's chats. Stored with the chat, so it follows them to any device. */
export async function setConversationFlags(convId: string, flags: { pinned?: boolean; archived?: boolean }) {
  await caller();
  await backendFetch(`/api/conversations/${encodeURIComponent(convId)}`, {
    method: "PATCH",
    body: JSON.stringify(flags),
  });
}

export async function moveConversationToMatter(convId: string, matterId: string | null) {
  await caller();
  await backendFetch(`/api/conversations/${encodeURIComponent(convId)}`, {
    method: "PATCH",
    body: JSON.stringify({ matterId }),
  });
}

export async function deleteConversation(convId: string) {
  await caller();
  await backendFetch(`/api/conversations/${encodeURIComponent(convId)}`, { method: "DELETE" });
}
