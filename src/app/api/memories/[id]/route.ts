import { proxyToBackend } from "@/lib/backend-proxy";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/memories/${encodeURIComponent(id)}`, { method: "PUT", body: await req.text(), json: true, timeoutMs: 15_000 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/memories/${encodeURIComponent(id)}`, { method: "DELETE", timeoutMs: 15_000 });
}
