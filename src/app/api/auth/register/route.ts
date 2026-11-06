import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  checkSignupAccess,
  signupPolicy,
  signupSchema,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { registerBackend } from "@/lib/backend-client";
import { env } from "@/env";

interface SignupRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  inviteCode?: unknown;
}

/** Public signup requirements (drives the invite-code field on the form). */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(signupPolicy());
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: SignupRequestBody;
  try {
    body = (await request.json()) as SignupRequestBody;
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
      {
        error: "Invalid signup details.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { name, email, password, inviteCode } = parsed.data;

  // Gate first: verify invite code policy
  const gateError = checkSignupAccess(email, inviteCode);
  if (gateError) {
    return NextResponse.json({ error: gateError }, { status: 403 });
  }

  try {
    // Register user via standalone soli-backend
    const authRes = await registerBackend({
      name,
      email,
      password,
      inviteCode,
    });

    // Set secure HTTP-only session cookie
    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, authRes.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: env.SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ user: authRes.user }, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes("already exists") ? 409 : 400;
    return NextResponse.json(
      { error: err.message || "Failed to create account." },
      { status }
    );
  }
}
