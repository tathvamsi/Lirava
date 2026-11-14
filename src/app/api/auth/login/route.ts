import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema, SESSION_COOKIE_NAME } from "@/lib/auth";
import { BackendError, loginBackend } from "@/lib/backend-client";
import { env } from "@/env";

export async function POST(request: Request): Promise<NextResponse> {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse({
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email,
    password: body.password,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid login details.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    // The backend checks the credentials and applies the per-address and per-account limits.
    // The visitor's address is passed along so the limits apply to them, not to this server.
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const authRes = await loginBackend(
      { email: parsed.data.email, password: parsed.data.password },
      clientIp ? { "x-forwarded-for": clientIp } : undefined,
    );

    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, authRes.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Matches the session's real expiry, so the cookie never outlives the session.
      expires: new Date(authRes.expiresAt),
    });

    return NextResponse.json({ user: authRes.user });
  } catch (err) {
    if (err instanceof BackendError && [400, 401, 403, 429].includes(err.status)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[login] backend error:", err);
    return NextResponse.json({ error: "Sign-in is unavailable right now. Please try again shortly." }, { status: 503 });
  }
}
