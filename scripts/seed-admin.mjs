#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const remote = process.argv.slice(2);
if (remote.some((arg) => arg !== "--remote") || remote.length > 1) {
  throw new Error("Usage: npm run db:seed-admin [-- --remote]");
}

const email = requiredEnv("ADMIN_EMAIL").trim().toLowerCase();
const fullName = requiredEnv("ADMIN_NAME").trim();
const password = requiredEnv("ADMIN_PASSWORD");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  throw new Error("ADMIN_EMAIL must be a valid email address.");
}
if (fullName.length < 2 || fullName.length > 80) {
  throw new Error("ADMIN_NAME must be between 2 and 80 characters.");
}
if (password.length < 8 || password.length > 200) {
  throw new Error("ADMIN_PASSWORD must be between 8 and 200 characters.");
}

const now = new Date().toISOString();
const userId = makeId("usr");
const wishlistId = makeId("wsh");
const auditId = makeId("aud");
const passwordHash = hashPassword(password);

if (remote.length) {
  seedRemote();
} else {
  seedLocal();
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Set it in the environment before running this command.`);
  }
  return value;
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(value, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function seedLocal() {
  const databaseFile = process.env.NIVAS_DB_PATH ?? path.join(root, ".data", "nivas.db");
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  const database = new DatabaseSync(databaseFile);
  try {
    database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    applyLocalMigrations(database);
    database.exec("BEGIN IMMEDIATE");
    try {
      if (database.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
        throw new Error(`An account with ${email} already exists. Use the existing-account promotion SQL in README.md.`);
      }

      database
        .prepare(
          `INSERT INTO users
             (id, email, password_hash, full_name, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        )
        .run(userId, email, passwordHash, fullName, now, now);
      database
        .prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'guest'), (?, 'admin')")
        .run(userId, userId);
      database
        .prepare(
          "INSERT INTO guest_profiles (user_id, phone, profile_image, created_at) VALUES (?, NULL, NULL, ?)",
        )
        .run(userId, now);
      database
        .prepare("INSERT INTO wishlists (id, user_id, name, created_at) VALUES (?, ?, 'Saved stays', ?)")
        .run(wishlistId, userId, now);
      database
        .prepare(
          `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
           VALUES (?, NULL, 'admin.bootstrap', 'user', ?, 'source=seed-admin', ?)`,
        )
        .run(auditId, userId, now);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }

  console.log(`Created administrator account ${email} in ${databaseFile}.`);
}

function applyLocalMigrations(database) {
  const migrationsDir = path.join(root, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }
  const migrationSql = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");
  database.exec(migrationSql);
}

function seedRemote() {
  const configPath = path.join(root, "wrangler.jsonc");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const databaseName =
    process.env.NIVAS_D1_DATABASE ??
    config.d1_databases?.find((database) => database.binding === "DB")?.database_name;
  if (!databaseName || !/^[\w.-]+$/.test(databaseName)) {
    throw new Error("Set NIVAS_D1_DATABASE or configure the DB database_name in wrangler.jsonc.");
  }

  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  const statements = [
    `INSERT INTO users (id, email, password_hash, full_name, status, created_at, updated_at)
     VALUES (${quote(userId)}, ${quote(email)}, ${quote(passwordHash)}, ${quote(fullName)}, 'active', ${quote(now)}, ${quote(now)});`,
    `INSERT INTO user_roles (user_id, role) VALUES (${quote(userId)}, 'guest'), (${quote(userId)}, 'admin');`,
    `INSERT INTO guest_profiles (user_id, phone, profile_image, created_at)
     VALUES (${quote(userId)}, NULL, NULL, ${quote(now)});`,
    `INSERT INTO wishlists (id, user_id, name, created_at)
     VALUES (${quote(wishlistId)}, ${quote(userId)}, 'Saved stays', ${quote(now)});`,
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
     VALUES (${quote(auditId)}, NULL, 'admin.bootstrap', 'user', ${quote(userId)}, 'source=seed-admin', ${quote(now)});`,
  ].join("\n");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nivas-admin-seed-"));
  const sqlFile = path.join(tempDir, "seed-admin.sql");
  try {
    fs.writeFileSync(sqlFile, statements, { encoding: "utf8", mode: 0o600 });
    const wranglerCli = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
    if (!fs.existsSync(wranglerCli)) {
      throw new Error("Wrangler is not installed. Run npm install before seeding remote D1.");
    }
    const result = spawnSync(
      process.execPath,
      [wranglerCli, "d1", "execute", databaseName, "--remote", "--file", sqlFile],
      { cwd: root, stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Wrangler D1 seed failed with exit code ${result.status ?? "unknown"}.`);
    }
  } finally {
    if (fs.existsSync(sqlFile)) fs.rmSync(sqlFile);
    fs.rmdirSync(tempDir);
  }

  console.log(`Created administrator account ${email} in remote D1 database ${databaseName}.`);
}
