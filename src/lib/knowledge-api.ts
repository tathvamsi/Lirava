/** Browser-side helpers for the knowledge base endpoints (/api/knowledge-bases). */

export type KnowledgeBase = { id: string; name: string; description: string; fileCount: number; createdAt: number; updatedAt: number };
export type KnowledgeFile = { id: string; name: string; status: "ready" | "no_text" | "unsupported" | "failed"; pages: number; unit: "page" | "section"; note: string | null; createdAt: number };
export type KnowledgeBaseDetail = KnowledgeBase & { files: KnowledgeFile[] };
export type LinkScope = "conversation" | "matter";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Calls the app's own API and turns every failure into a readable message. */
export async function kbRequest<T>(url: string, init: { method?: string; body?: unknown | FormData } = {}): Promise<ApiResult<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
    const res = await fetch(url, {
      method: init.method ?? "GET",
      cache: "no-store",
      headers: init.body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
    });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) return { ok: false, error: data?.error ?? "Something went wrong. Please try again." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Could not reach the service. Please try again." };
  }
}

export const STATUS_LABEL: Record<KnowledgeFile["status"], string> = {
  ready: "Searchable",
  no_text: "No readable text",
  unsupported: "Not searchable",
  failed: "Could not be read",
};
