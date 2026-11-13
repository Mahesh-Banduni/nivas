import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { nowIso } from "@/lib/date";
import { sha256 } from "@/lib/password";
import { unauthorized } from "@/lib/errors";
import type { Role } from "@/db/types";
import { findSessionUser, getRoles } from "./auth.repository";

export const SESSION_COOKIE = "nivas_session";
export const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarColor: string;
  roles: Role[];
  sessionId: string;
}

/**
 * Resolves the signed-in user from the session cookie. Cached per request so
 * layouts, pages and API handlers share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const row = await findSessionUser(db, sha256(token), nowIso());
  if (!row) return null;

  const roles = await getRoles(db, row.id);
  return {
    id: row.id,
    email: row.email,
    name: row.full_name,
    phone: row.phone,
    avatarColor: row.avatar_color,
    roles,
    sessionId: row.session_id,
  };
});

export function hasRole(user: CurrentUser | null, role: Role): boolean {
  return !!user?.roles.includes(role);
}

export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath ?? "/")}`);
  }
  return user;
}

export async function requireRole(role: Role, nextPath?: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (!user.roles.includes(role)) {
    if (role === "owner") redirect("/become-a-host");
    redirect("/");
  }
  return user;
}

/** For route handlers: throws a 401 instead of redirecting. */
export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function setSessionCookie(token: string, expiresAt: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
