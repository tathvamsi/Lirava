import { proxyToBackend } from "@/lib/backend-proxy";

/** The knowledge bases attached to one chat or matter: ?scope=conversation|matter&id=… */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = encodeURIComponent(searchParams.get("scope") ?? "");
  const id = encodeURIComponent(searchParams.get("id") ?? "");
  return proxyToBackend(`/api/knowledge-bases/links?scope=${scope}&id=${id}`, { timeoutMs: 15_000 });
}

export async function PUT(req: Request) {
  return proxyToBackend("/api/knowledge-bases/links", { method: "PUT", body: await req.text(), json: true, timeoutMs: 15_000 });
}
