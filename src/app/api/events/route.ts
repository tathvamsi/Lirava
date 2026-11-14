import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL, backendAuthHeaders } from "@/lib/backend-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy the SSE stream from the standalone backend. The backend identifies the
// user from the forwarded session token and only sends that user's events.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in required.", { status: 401 });

  try {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    req.signal.addEventListener("abort", onAbort);

    const backendRes = await fetch(`${BACKEND_URL}/api/events`, {
      headers: {
        Accept: "text/event-stream",
        ...(await backendAuthHeaders()),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!backendRes.ok || !backendRes.body) {
      req.signal.removeEventListener("abort", onAbort);
      return new Response("Failed to connect to backend event stream", {
        status: backendRes.status === 401 ? 401 : 502,
      });
    }

    const reader = backendRes.body.getReader();
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            req.signal.removeEventListener("abort", onAbort);
            return;
          }
          controller.enqueue(value);
        } catch {
          // Gracefully handle client navigation or socket disconnects without crashing the dev server
          try {
            controller.close();
          } catch {}
          req.signal.removeEventListener("abort", onAbort);
        }
      },
      cancel() {
        req.signal.removeEventListener("abort", onAbort);
        controller.abort();
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    if (req.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(`Backend offline: ${message}`, { status: 503 });
  }
}
