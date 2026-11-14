import { proxyToBackend } from "@/lib/backend-proxy";

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const body = await req.text();
  return proxyToBackend(`/api/preferences/${encodeURIComponent(key)}`, { method: "PUT", body, json: true, timeoutMs: 15_000 });
}
