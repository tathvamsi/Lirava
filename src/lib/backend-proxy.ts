import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL, backendAuthHeaders } from "@/lib/backend-client";

/** Response headers worth passing from the backend to the browser unchanged. */
const PASS_HEADERS = ["content-type", "content-disposition", "content-length", "x-content-type-options", "content-security-policy"];

/**
 * Forwards a request to the backend as the signed-in user and relays the answer.
 * The user's identity travels in the session token, never in the request body.
 */
export async function proxyToBackend(
  path: string,
  init: { method?: string; body?: BodyInit | null; json?: boolean; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: init.method ?? "GET",
      headers: { ...(init.json ? { "Content-Type": "application/json" } : {}), ...(await backendAuthHeaders()) },
      body: init.body ?? undefined,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(init.timeoutMs ?? 30_000),
    });

    const headers = new Headers();
    for (const name of PASS_HEADERS) {
      const value = res.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Other people's documents must never sit in a shared cache.
    headers.set("Cache-Control", "private, no-store");
    return new Response(res.body, { status: res.status, headers });
  } catch {
    return NextResponse.json({ error: "The service is unavailable right now. Please try again." }, { status: 502 });
  }
}
