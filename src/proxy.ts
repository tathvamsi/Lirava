import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

/** Pages that need a signed-in user. */
const PROTECTED_PAGES = ["/vakil", "/new", "/matters", "/artifacts", "/knowledge", "/notes", "/settings", "/connections"];
/** API routes that need a signed-in user (each also checks the session itself, with the database). */
const PROTECTED_API = ["/api/conversations", "/api/vakils", "/api/events", "/api/files", "/api/documents", "/api/preferences", "/api/memories", "/api/knowledge-bases", "/api/notes", "/api/automations", "/api/integrations", "/api/auth/profile", "/api/auth/password", "/api/legal", "/api/artifacts", "/api/agent", "/api/backend"];
const AUTH_PAGES = ["/login", "/signup"];

const under = (pathname: string, prefixes: string[]) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Optimistic first check: verifies the session token's signature and expiry from the cookie.
 * Pages and route handlers still perform their own database-backed check, which is what
 * makes a logged-out or revoked session stop working. This is for redirects and early 401s.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = token && secret ? await verifySessionToken(token, secret) : null;

  if (!session && under(pathname, PROTECTED_API)) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!session && under(pathname, PROTECTED_PAGES)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/vakil/:path*",
    "/new/:path*",
    "/matters/:path*",
    "/artifacts/:path*",
    "/knowledge/:path*",
    "/notes/:path*",
    "/settings/:path*",
    "/connections/:path*",
    "/api/conversations/:path*",
    "/api/vakils/:path*",
    "/api/events/:path*",
    "/api/files/:path*",
    "/api/documents/:path*",
    "/api/preferences/:path*",
    "/api/memories/:path*",
    "/api/knowledge-bases/:path*",
    "/api/notes/:path*",
    "/api/automations/:path*",
    "/api/integrations/:path*",
    "/api/auth/profile",
    "/api/auth/password",
    "/api/legal/:path*",
    "/api/artifacts/:path*",
    "/api/agent/:path*",
    "/api/backend/:path*",
  ],
};
