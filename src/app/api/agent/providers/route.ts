import { proxyToBackend } from "@/lib/backend-proxy";

/** Which AI models the chat can use, and which are set up on the server (never their keys). */
export async function GET() {
  return proxyToBackend("/api/agent/providers");
}
