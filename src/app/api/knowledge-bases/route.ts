import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/knowledge-bases", { timeoutMs: 15_000 });
}

export async function POST(req: Request) {
  return proxyToBackend("/api/knowledge-bases", { method: "POST", body: await req.text(), json: true, timeoutMs: 15_000 });
}
