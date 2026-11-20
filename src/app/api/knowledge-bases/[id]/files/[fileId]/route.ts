import { proxyToBackend } from "@/lib/backend-proxy";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  return proxyToBackend(`/api/knowledge-bases/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`, { method: "DELETE", timeoutMs: 30_000 });
}
