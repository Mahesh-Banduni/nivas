import type { Database } from "@/db/database";
import type { Role, UserRow } from "@/db/types";

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  phone: string | null;
  avatar_color: string;
  status: "active" | "suspended" | "deleted";
}

export interface SessionUser extends AuthUser {
  session_id: string;
}

export async function findUserByEmail(db: Database, email: string) {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<AuthUser>();
}

export async function findUserById(db: Database, id: string) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<AuthUser>();
}

export async function getRoles(db: Database, userId: string): Promise<Role[]> {
  const rows = await db
    .prepare("SELECT role FROM user_roles WHERE user_id = ? ORDER BY role")
    .bind(userId)
    .all<{ role: Role }>();
  return rows.map((row) => row.role);
}

export async function getRolesForUsers(db: Database, userIds: string[]) {
  if (!userIds.length) return new Map<string, Role[]>();
  const placeholders = userIds.map(() => "?").join(",");
  const rows = await db
    .prepare(`SELECT user_id, role FROM user_roles WHERE user_id IN (${placeholders})`)
    .bind(...userIds)
    .all<{ user_id: string; role: Role }>();
  const map = new Map<string, Role[]>();
  for (const row of rows) {
    map.set(row.user_id, [...(map.get(row.user_id) ?? []), row.role]);
  }
  return map;
}

export async function insertUser(
  db: Database,
  input: {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string | null;
    avatarColor: string;
    createdAt: string;
  },
): Promise<UserRow> {
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, full_name, phone, avatar_color, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .bind(
      input.id,
      input.email.toLowerCase(),
      input.passwordHash,
      input.fullName,
      input.phone ?? null,
      input.avatarColor,
      input.createdAt,
      input.createdAt,
    )
    .run();
  return {
    id: input.id,
    email: input.email,
    password_hash: input.passwordHash,
    full_name: input.fullName,
    phone: input.phone ?? null,
    avatar_color: input.avatarColor,
    status: "active",
    created_at: input.createdAt,
    updated_at: input.createdAt,
  };
}

export async function insertRole(db: Database, userId: string, role: Role) {
  await db
    .prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)")
    .bind(userId, role)
    .run();
}

export async function insertGuestProfile(db: Database, userId: string, phone: string | null, createdAt: string) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO guest_profiles (user_id, phone, profile_image, created_at) VALUES (?, ?, NULL, ?)",
    )
    .bind(userId, phone, createdAt)
    .run();
}

export async function insertOwnerProfile(
  db: Database,
  input: { userId: string; businessName: string; bio?: string | null; createdAt: string },
) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO owner_profiles (user_id, business_name, bio, verification_status, payout_last4, created_at)
       VALUES (?, ?, ?, 'pending', NULL, ?)`,
    )
    .bind(input.userId, input.businessName, input.bio ?? null, input.createdAt)
    .run();
}

export async function insertSession(
  db: Database,
  input: { id: string; userId: string; tokenHash: string; userAgent: string | null; expiresAt: string; createdAt: string },
) {
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(input.id, input.userId, input.tokenHash, input.userAgent, input.expiresAt, input.createdAt)
    .run();
}

export async function findSessionUser(db: Database, tokenHash: string, now: string) {
  return db
    .prepare(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.phone, u.avatar_color, u.status, s.id AS session_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
    )
    .bind(tokenHash, now)
    .first<SessionUser>();
}

export async function deleteSession(db: Database, tokenHash: string) {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function deleteExpiredSessions(db: Database, now: string) {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
}
