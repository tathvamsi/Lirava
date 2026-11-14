import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  checkSignupAccess,
  signupPolicy,
  signupSchema,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { BackendError, registerBackend } from "@/lib/backend-client";
import { env } from "@/env";

/** Public signup requirements (drives the invite-code field on the form). */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(signupPolicy());
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { name?: unknown; email?: unknown; password?: unknown; inviteCode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse({
    name: typeof body.name === "string" ? body.name.trim() : body.name,
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email,
    password: body.password,
    inviteCode: typeof body.inviteCode === "string" ? body.inviteCode : "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid signup details.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password, inviteCode } = parsed.data;

  // Quick check here for a friendly message; the backend enforces the same rules and is the authority.
  const gateError = checkSignupAccess(email, inviteCode);
  if (gateError) {
    return NextResponse.json({ error: gateError }, { status: 403 });
  }

  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const authRes = await registerBackend(
      { name, email, password, inviteCode },
      clientIp ? { "x-forwarded-for": clientIp } : undefined,
    );

    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, authRes.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(authRes.expiresAt),
    });

    return NextResponse.json({ user: authRes.user }, { status: 201 });
  } catch (err) {
    if (err instanceof BackendError && [400, 403, 409, 429].includes(err.status)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[register] backend error:", err);
    return NextResponse.json({ error: "Sign-up is unavailable right now. Please try again shortly." }, { status: 503 });
  }
}
