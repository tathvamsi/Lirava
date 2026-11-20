import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/memories", { timeoutMs: 15_000 });
}

export async function POST(req: Request) {
  return proxyToBackend("/api/memories", { method: "POST", body: await req.text(), json: true, timeoutMs: 15_000 });
}

/** Forget everything. */
export async function DELETE() {
  return proxyToBackend("/api/memories", { method: "DELETE", timeoutMs: 15_000 });
}
