import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1" ? "?download=1" : "";
  return proxyToBackend(`/api/files/${encodeURIComponent(fileId)}${download}`, { timeoutMs: 60_000 });
}
