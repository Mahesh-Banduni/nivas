import { getDb } from "@/db";
import type { Database } from "@/db/database";
import type { Role } from "@/db/types";
import { newId } from "@/lib/ids";
import { hashPassword, sha256, verifyPassword } from "@/lib/password";
import { addDays, nowIso } from "@/lib/date";
import { AppError, conflict, forbidden, unauthorized } from "@/lib/errors";
import { auditStatement } from "@/modules/admin/audit";
import { outboxStatement } from "@/modules/notifications/outbox";
import { randomToken } from "@/lib/ids";
import {
  deleteSession,
  findUserByEmail,
  findUserById,
  getRoles,
  insertGuestProfile,
  insertOwnerProfile,
  insertRole,
  insertSession,
  insertUser,
} from "./auth.repository";
import { SESSION_DAYS, type CurrentUser } from "./session";
import type { LoginInput, RegisterInput } from "./auth.schema";

const AVATAR_COLORS = ["#234A3D", "#B0602F", "#3C5A7A", "#7A4A63", "#8A6A2F", "#46605A"];

const globalForLimiter = globalThis as unknown as { __nivasAttempts?: Map<string, { count: number; resetAt: number }> };
const attempts = (globalForLimiter.__nivasAttempts ??= new Map());

function rateLimit(key: string, limit = 6, windowMs = 15 * 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
}

export interface SessionResult {
  token: string;
  expiresAt: string;
  userId: string;
}

async function createSession(db: Database, userId: string, userAgent: string | null): Promise<SessionResult> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await insertSession(db, {
    id: newId("ses"),
    userId,
    tokenHash: sha256(token),
    userAgent,
    expiresAt,
    createdAt: nowIso(),
  });
  return { token, expiresAt, userId };
}

export async function registerUser(input: RegisterInput, userAgent: string | null): Promise<SessionResult> {
  const db = await getDb();
  const existing = await findUserByEmail(db, input.email);
  if (existing) {
    throw conflict("An account with this email already exists. Try signing in instead.");
  }

  const createdAt = nowIso();
  const userId = newId("usr");
  await insertUser(db, {
    id: userId,
    email: input.email,
    passwordHash: hashPassword(input.password),
    fullName: input.fullName,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt,
  });
  await insertRole(db, userId, "guest");
  await insertGuestProfile(db, userId, null, createdAt);

  if (input.role === "owner" && input.businessName) {
    await insertRole(db, userId, "owner");
    await insertOwnerProfile(db, {
      userId,
      businessName: input.businessName,
      createdAt,
    });
  }

  await db
    .prepare("INSERT INTO wishlists (id, user_id, name, created_at) VALUES (?, ?, 'Saved stays', ?)")
    .bind(newId("wsh"), userId, createdAt)
    .run();

  await db.batch([
    outboxStatement(db, {
      type: "user.registered",
      aggregateType: "user",
      aggregateId: userId,
      payload: { userId, email: input.email, name: input.fullName, role: input.role },
    }),
    auditStatement(db, {
      actorId: userId,
      action: "user.registered",
      entityType: "user",
      entityId: userId,
      metadata: `role=${input.role}`,
    }),
  ]);

  return createSession(db, userId, userAgent);
}

export async function loginUser(input: LoginInput, userAgent: string | null): Promise<SessionResult> {
  const db = await getDb();
  rateLimit(`login:${input.email}`);

  const user = await findUserByEmail(db, input.email);
  if (!user || !verifyPassword(input.password, user.password_hash)) {
    throw unauthorized("Email or password is incorrect");
  }
  if (user.status === "suspended") {
    throw forbidden("This account has been suspended. Contact support if you think this is a mistake.");
  }

  attempts.delete(`login:${input.email}`);
  return createSession(db, user.id, userAgent);
}

export async function logoutUser(token: string | undefined) {
  if (!token) return;
  const db = await getDb();
  await deleteSession(db, sha256(token));
}

export async function becomeOwner(
  userId: string,
  input: { businessName: string; bio?: string },
): Promise<void> {
  const db = await getDb();
  const user = await findUserById(db, userId);
  if (!user) throw unauthorized();

  const roles = await getRoles(db, userId);
  const createdAt = nowIso();
  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'owner')")
      .bind(userId),
    db
      .prepare(
        `INSERT OR IGNORE INTO owner_profiles (user_id, business_name, bio, verification_status, created_at)
         VALUES (?, ?, ?, 'pending', ?)`,
      )
      .bind(userId, input.businessName, input.bio ?? null, createdAt),
    auditStatement(db, {
      actorId: userId,
      action: roles.includes("owner") ? "owner.profile_updated" : "owner.joined",
      entityType: "user",
      entityId: userId,
      metadata: input.businessName,
    }),
  ]);
}

export async function profileForUser(user: CurrentUser) {
  const db = await getDb();
  const owner = await db
    .prepare("SELECT * FROM owner_profiles WHERE user_id = ?")
    .bind(user.id)
    .first<{
      business_name: string;
      bio: string | null;
      verification_status: string;
      payout_last4: string | null;
      created_at: string;
    }>();
  return { owner };
}

export { addDays };
