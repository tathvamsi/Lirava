import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/preferences", { timeoutMs: 15_000 });
}
