import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/backend-client";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const convId = url.searchParams.get("conversationId");
  const q = new URLSearchParams({ userId: user.id });
  if (url.searchParams.get("agentOnly") === "true") q.set("agentOnly", "true");
  if (convId) q.set("conversationId", convId);

  try {
    const res = await fetch(`${BACKEND_URL}/api/artifacts?${q.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: "Unable to load artifacts. Please try again." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, userId: user.id }),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: "Unable to save artifact. Please try again." }, { status: 502 });
  }
}
