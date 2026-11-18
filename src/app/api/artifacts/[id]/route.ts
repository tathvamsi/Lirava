import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/artifacts/${encodeURIComponent(id)}`);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  return proxyToBackend(`/api/artifacts/${encodeURIComponent(id)}`, { method: "PATCH", body, json: true, timeoutMs: 60_000 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/artifacts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
