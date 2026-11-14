import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL, backendAuthHeaders } from "@/lib/backend-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ messages: [], error: "Unauthorized" }, { status: 401 });

  try {
    // The backend only returns this conversation if it belongs to the signed-in user.
    const res = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`, {
      headers: await backendAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json({ messages: [], error: "Conversation not found" }, { status: res.status === 401 ? 401 : 404 });
    }
    const data = await res.json();
    return Response.json({ messages: data.messages || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load conversation";
    return Response.json({ messages: [], error: message }, { status: 500 });
  }
}
