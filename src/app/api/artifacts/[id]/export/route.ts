import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "docx" ? "docx" : "pdf";
  return proxyToBackend(`/api/artifacts/${encodeURIComponent(id)}/export?format=${format}`, { timeoutMs: 60_000 });
}
