import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL, backendAuthHeaders } from "@/lib/backend-client";

/**
 * Stop the signed-in user's running response. This is a plain route (not a server action)
 * because server actions run one at a time, so a Stop sent that way would wait behind the
 * very response it is meant to cancel.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { vakilId?: unknown; conversationId?: unknown } | null;
  const vakilId = typeof body?.vakilId === "string" ? body.vakilId : "";
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;
  if (!vakilId) return Response.json({ error: "vakilId is required." }, { status: 400 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await backendAuthHeaders()) },
      body: JSON.stringify({ vakilId, conversationId }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return Response.json({ error: "Could not reach the service." }, { status: 502 });
  }
}
