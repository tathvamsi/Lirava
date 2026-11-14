import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = new URLSearchParams();
  if (url.searchParams.get("agentOnly") === "true") q.set("agentOnly", "true");
  return proxyToBackend(`/api/artifacts${q.size ? `?${q}` : ""}`, { timeoutMs: 15_000 });
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToBackend("/api/artifacts", { method: "POST", body, json: true, timeoutMs: 60_000 });
}
