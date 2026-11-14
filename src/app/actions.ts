"use server";

import { requireUser } from "@/lib/auth";
import { buildConversationTitle } from "@/lib/conversation-title";
import type { Attachment } from "@/lib/types";
import {
  backendFetch,
  createBackendConversation,
  sendVakilMessage,
  createBackendMatter,
  fetchMatters,
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
  const renamed: Array<{ id: string; title: string }> = [];
  // Only chats with a placeholder title are opened, and at most a handful per visit.
  for (const conversation of conversations.filter((c) => GENERIC_TITLES.has(c.title)).slice(0, 10)) {
    const data = await fetchConversation(conversation.id);
    const firstUserMessage = data?.messages.find((message) => message.role === "user" && message.text.trim());
    if (!firstUserMessage) continue;
    const title = buildConversationTitle(firstUserMessage.text);
    if (title === conversation.title) continue;
    await renameConversation(conversation.id, title);
    renamed.push({ id: conversation.id, title });
  }
  return renamed;
}

export async function sendMessage(
  vakilId: string,
  text: string,
  attachments: Attachment[] = [],
  conversationId?: string,
  messageId?: string
) {
  if (!text.trim() && !attachments.length) return;
  const user = await caller();

  // In the background: the question is saved and this returns at once. The answer streams in as it is written.
  const res = await sendVakilMessage(vakilId, text.trim(), user.id, conversationId, messageId, attachments, true);
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
  matterId?: string
) {
  const user = await caller();
  const conv = await createBackendConversation(
    vakilId,
    buildConversationTitle(text),
    user.id,
    customConvId,
    matterId
  );
  const res = await sendVakilMessage(vakilId, text.trim(), user.id, conv.id, messageId, attachments, true);
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
