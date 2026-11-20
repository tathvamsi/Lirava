import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path: string[] }> };

/** Only the connector and plugin endpoints are reachable. The provider's browser callback goes straight to the backend, never through here. */
const ALLOWED = new Set(["connectors", "plugins"]);

/** Forwards /api/integrations/<connectors|plugins>/... to the backend's /api/<connectors|plugins>/..., as the signed-in user. */
async function forward(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  if (!ALLOWED.has(path[0]) || path[1] === "callback") return Response.json({ error: "Not found." }, { status: 404 });
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.method !== "DELETE";
  return proxyToBackend(`/api/${path.map(encodeURIComponent).join("/")}`, {
    method: req.method,
    body: hasBody ? await req.text() : undefined,
    json: hasBody,
    timeoutMs: 30_000,
  });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
