import { proxyToBackend } from "@/lib/backend-proxy";

/** Change the signed-in user's password. The backend checks the current password and the session. */
export async function POST(req: Request) {
  return proxyToBackend("/api/auth/password", { method: "POST", body: await req.text(), json: true, timeoutMs: 20_000 });
}
