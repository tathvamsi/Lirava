import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/env";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "./token";
import type { UserRole } from "./roles";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Create a database session row, sign a JWT for it, and set the cookie. */
export async function createSession(userId: string): Promise<void> {
  const maxAgeSeconds = env.SESSION_MAX_AGE_SECONDS;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  const [row] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id });
  if (!row) {
    throw new Error("Failed to create session.");
  }

  const token = await signSessionToken({
    userId,
    sessionId: row.id,
    secret: env.SESSION_SECRET,
    maxAgeSeconds,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, cookieOptions(maxAgeSeconds));
}

/**
 * Secure session check: verifies session via standalone soli-backend,
 * falling back to local DB if backend is starting up.
 */
/** Cached for the duration of one request, so the layout and the page share a single lookup. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token, env.SESSION_SECRET);
  if (!claims) return null;

  // 1. Ask the backend. If it says the session is invalid, that is final: a signed-out or revoked
  //    session must never be rescued by the fallback below.
  try {
    const { getBackendUser } = await import("@/lib/backend-client");
    const user = await getBackendUser(token);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role === "admin" ? "admin" : "user",
    };
  } catch {
    // The backend could not be reached at all: fall through to the local check.
  }

  // 2. Backend unreachable: check the session directly in the database
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .innerJoin(sessions, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.id, claims.sessionId),
          eq(sessions.userId, claims.userId),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const [row] = rows;
    if (!row) return null;
    const role: UserRole = row.role === "admin" ? "admin" : "user";
    return { id: row.id, name: row.name, email: row.email, role };
  } catch {
    return null;
  }
});

/** Use at the top of protected pages; redirects anonymous users to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Use at the top of admin pages; non-admins go to the home page. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/");
  }
  return user;
}

/** Delete the session row (revocation) and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      const { logoutBackend } = await import("@/lib/backend-client");
      await logoutBackend(token);
    } catch {}
    try {
      const claims = await verifySessionToken(token, env.SESSION_SECRET);
      if (claims) {
        await db.delete(sessions).where(eq(sessions.id, claims.sessionId));
      }
    } catch {}
  }
  store.delete(SESSION_COOKIE_NAME);
}
