import "server-only";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema, SESSION_COOKIE_NAME } from "@/lib/auth";
import { loginBackend } from "@/lib/backend-client";
import { env } from "@/env";

// In-memory rate limiter for demo (resets on server restart).
// Tracks failed logins per IP; throttles after 20 rapid bad attempts.
const failedLogins = new Map<string, { count: number; first: number }>();

function trackFailedLogin(ip: string) {
  const entry = failedLogins.get(ip) ?? { count: 0, first: Date.now() };
  entry.count++;
  if (entry.count === 1) entry.first = Date.now();
  failedLogins.set(ip, entry);
}

function isRateLimited(ip: string): boolean {
  const entry = failedLogins.get(ip);
  if (!entry) return false;
  return entry.count >= 20 && Date.now() - entry.first < 5 * 60 * 1000;
}

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const realIp =
    (request as any).headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    (request as any).socket?.remoteAddress ||
    "unknown-ip";
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (isRateLimited(realIp)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  trackFailedLogin(realIp);

  const parsed = loginSchema.safeParse({
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email,
    password: body.password,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid login details.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    // Authenticate via standalone soli-backend
    const authRes = await loginBackend({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    failedLogins.delete(realIp);

    // Set secure HTTP-only session cookie
    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, authRes.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: env.SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({
      user: authRes.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Invalid email or password." },
      { status: 401 }
    );
  }
}
