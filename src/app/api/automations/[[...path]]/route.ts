import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path?: string[] }> };

/** Forwards /api/automations and everything under it to the backend, as the signed-in user. */
async function forward(req: Request, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  const suffix = path.map(encodeURIComponent).join("/");
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.method !== "DELETE";
  return proxyToBackend(`/api/automations${suffix ? `/${suffix}` : ""}`, {
    method: req.method,
    body: hasBody ? await req.text() : undefined,
    json: hasBody,
    timeoutMs: 20_000,
  });
}

export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
