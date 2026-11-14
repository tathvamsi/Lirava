import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/artifacts/${encodeURIComponent(id)}`);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/artifacts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
