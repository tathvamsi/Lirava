import { proxyToBackend } from "@/lib/backend-proxy";

/** Change the signed-in user's display name. The backend checks the session; identity never comes from the body. */
export async function PATCH(req: Request) {
  return proxyToBackend("/api/auth/profile", { method: "PATCH", body: await req.text(), json: true, timeoutMs: 15_000 });
}
