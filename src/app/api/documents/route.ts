import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const matterId = new URL(req.url).searchParams.get("matterId") ?? "";
  return proxyToBackend(`/api/documents?matterId=${encodeURIComponent(matterId)}`, { timeoutMs: 15_000 });
}
