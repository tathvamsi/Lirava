import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ id: string }> };
const path = async (ctx: Ctx) => `/api/notes/${encodeURIComponent((await ctx.params).id)}`;

export async function GET(_req: Request, ctx: Ctx) {
  return proxyToBackend(await path(ctx), { timeoutMs: 15_000 });
}

export async function PUT(req: Request, ctx: Ctx) {
  return proxyToBackend(await path(ctx), { method: "PUT", body: await req.text(), json: true, timeoutMs: 15_000 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return proxyToBackend(await path(ctx), { method: "DELETE", timeoutMs: 15_000 });
}
