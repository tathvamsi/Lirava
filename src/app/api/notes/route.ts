import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const matterId = new URL(req.url).searchParams.get("matterId");
  return proxyToBackend(`/api/notes${matterId ? `?matterId=${encodeURIComponent(matterId)}` : ""}`, { timeoutMs: 15_000 });
}

export async function POST(req: Request) {
  return proxyToBackend("/api/notes", { method: "POST", body: await req.text(), json: true, timeoutMs: 15_000 });
}
