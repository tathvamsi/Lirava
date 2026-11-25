import type { Attachment, CaseNode, CaseNodeInput, Conversation, Vakil, Matter, MatterEvent, MatterIntake, Message } from "./types";

export const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

/**
 * Authorization header carrying the signed-in user's session token, read from the
 * request cookie. Empty outside a request (or when signed out). The backend takes
 * the user's identity from this token, never from anything in the request body.
 */
export async function backendAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get("soli_session")?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** A failed call to the backend, carrying its HTTP status so callers can answer accurately (401 vs 429 vs 500). */
export class BackendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

// The response shape differs per endpoint and each call site names the type it expects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function backendFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BACKEND_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...(await backendAuthHeaders()),
    ...(options.headers || {}),
  };

  const signal = options.signal ?? AbortSignal.timeout(Number(process.env.BACKEND_TIMEOUT_MS || 150_000));
  const res = await fetch(url, {
    ...options,
    headers,
    signal,
  });

  if (!res.ok) {
    let errMsg = `Backend request failed: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (typeof errBody.error === "string") errMsg = errBody.error;
    } catch {
      // Not JSON: keep the generic message.
    }
    throw new BackendError(errMsg, res.status);
  }

  // Handle binary data or text
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res as unknown as T;
}

// ---------------- Agent Execution ----------------
export async function sendVakilMessage(
  vakilId: string,
  text: string,
  userId?: string,
  conversationId?: string,
  messageId?: string,
  attachments?: Attachment[],
  /** Save the question and return at once; the answer arrives through the live stream. */
  background = false,
  /** The model the user picked (custom, nvidia or sarvam). Left out, the server's default is used. */
  provider?: string,
) {
  return backendFetch("/api/agent/message", {
    method: "POST",
    body: JSON.stringify({ vakilId, text, userId, conversationId, messageId, attachments, background, provider }),
  });
}

// ---------------- Vakils ----------------
export async function fetchVakils(): Promise<Vakil[]> {
  const data = await backendFetch<{ vakils?: Vakil[] }>("/api/vakils");
  return data.vakils ?? [];
}

export async function fetchVakil(id: string): Promise<Vakil | null> {
  try {
    const data = await backendFetch<{ vakil?: Vakil }>(`/api/vakils/${encodeURIComponent(id)}`);
    return data.vakil ?? null;
  } catch {
    return null;
  }
}

// ---------------- Conversations ----------------
export async function fetchConversations(userId: string = "", vakilId?: string): Promise<Conversation[]> {
  const q = new URLSearchParams();
  if (userId) q.set("userId", userId);
  if (vakilId) q.set("vakilId", vakilId);
  const data = await backendFetch<{ conversations: Conversation[] }>(`/api/conversations?${q.toString()}`);
  return data.conversations || [];
}

export async function fetchMatters(userId: string): Promise<Matter[]> {
  const data = await backendFetch<{ matters: Matter[] }>(`/api/matters?userId=${encodeURIComponent(userId)}`);
  return (data.matters || []).map(normalizeMatter);
}

export async function createBackendMatter(input: { userId: string; title: string; client?: string; court?: string; nextDate?: string; notes?: string; intake?: MatterIntake }): Promise<Matter> {
  const data = await backendFetch<{ matter: Matter }>("/api/matters", { method: "POST", body: JSON.stringify(input) });
  return normalizeMatter(data.matter);
}

export async function fetchMatterFile(id: string): Promise<{ matter: Matter; events: MatterEvent[] } | null> {
  try {
    const data = await backendFetch<{ matter: Matter; events: MatterEvent[] }>(`/api/matters/${encodeURIComponent(id)}`);
    return { matter: normalizeMatter(data.matter), events: data.events || [] };
  } catch {
    return null;
  }
}

export async function resolveBackendCheckpoint(matterId: string, eventId: string, resolution: "approved" | "changes", note: string): Promise<MatterEvent[]> {
  const data = await backendFetch<{ events: MatterEvent[] }>(`/api/matters/${encodeURIComponent(matterId)}/checkpoints/${encodeURIComponent(eventId)}`, {
    method: "POST",
    body: JSON.stringify({ resolution, note }),
  });
  return data.events || [];
}

export async function setBackendMatterStatus(id: string, status: "active" | "on_hold" | "closed" | "archived"): Promise<Matter> {
  const data = await backendFetch<{ matter: Matter }>(`/api/matters/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
  return normalizeMatter(data.matter);
}

export async function fetchCaseNodes(matterId: string): Promise<CaseNode[]> {
  const data = await backendFetch<{ nodes: CaseNode[] }>(`/api/matters/${encodeURIComponent(matterId)}/nodes`);
  return data.nodes || [];
}

export async function createCaseNode(matterId: string, input: CaseNodeInput): Promise<CaseNode> {
  const data = await backendFetch<{ node: CaseNode }>(`/api/matters/${encodeURIComponent(matterId)}/nodes`, { method: "POST", body: JSON.stringify(input) });
  return data.node;
}

export async function updateCaseNode(matterId: string, nodeId: string, input: CaseNodeInput): Promise<CaseNode> {
  const data = await backendFetch<{ node: CaseNode }>(`/api/matters/${encodeURIComponent(matterId)}/nodes/${encodeURIComponent(nodeId)}`, { method: "PATCH", body: JSON.stringify(input) });
  return data.node;
}

export async function removeCaseNode(matterId: string, nodeId: string): Promise<CaseNode[]> {
  const data = await backendFetch<{ nodes: CaseNode[] }>(`/api/matters/${encodeURIComponent(matterId)}/nodes/${encodeURIComponent(nodeId)}`, { method: "DELETE" });
  return data.nodes || [];
}

export async function importCaseNodes(matterId: string): Promise<{ added: number; nodes: CaseNode[] }> {
  return backendFetch(`/api/matters/${encodeURIComponent(matterId)}/nodes/import`, { method: "POST", body: "{}" });
}

export async function deleteBackendMatter(id: string): Promise<void> {
  await backendFetch(`/api/matters/${encodeURIComponent(id)}`, { method: "DELETE" });
}

function normalizeMatter(matter: Matter): Matter {
  const status = matter.status as string;
  return { ...matter, status: status === "active" ? "Active" : status === "on_hold" ? "On hold" : status === "archived" ? "Archived" : "Closed" };
}

export async function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  try {
    return await backendFetch<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createBackendConversation(vakilId: string, title?: string, userId?: string, id?: string, matterId?: string): Promise<Conversation> {
  const data = await backendFetch<{ conversation: Conversation }>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ vakilId, title, userId, id, matterId }),
  });
  return data.conversation;
}

// ---------------- Authentication ----------------
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export async function loginBackend(
  input: { email: string; password: string },
  headers?: Record<string, string>,
): Promise<AuthResponse> {
  return backendFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
}

export async function registerBackend(
  input: { name: string; email: string; password: string; inviteCode?: string },
  headers?: Record<string, string>,
): Promise<AuthResponse> {
  return backendFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
}

/**
 * The user behind a session token. Returns null when the backend says the session is not valid
 * (signed out, expired, revoked): that answer is final. Throws when the backend cannot be reached,
 * so the caller can tell "not signed in" apart from "cannot check right now".
 */
export async function getBackendUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await backendFetch<{ user: AuthUser }>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.user ?? null;
  } catch (err) {
    if (err instanceof BackendError && err.status === 401) return null;
    throw err;
  }
}

export async function logoutBackend(token: string): Promise<boolean> {
  try {
    await backendFetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    return false;
  }
}
