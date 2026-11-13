import type { Database } from "./database";
import { getCloudflareDb } from "@/infrastructure/cloudflare/env";

/**
 * Selects D1 when an OpenNext Cloudflare binding is available; otherwise
 * initializes the local SQLite database and demo seed.
 *
 * Production D1 migrations are applied separately with Wrangler.
 */

const globalForDb = globalThis as unknown as {
  __nivasDb?: Database;
  __nivasDbReady?: Promise<Database>;
};

async function init(): Promise<Database> {
  const cloudflareDb = await getCloudflareDb();
  if (cloudflareDb) return cloudflareDb;

  if (!globalForDb.__nivasDb) {
    const [{ LocalDatabase }, fs, path, { seedDatabase }] = await Promise.all([
      import("./local-sqlite"),
      import("node:fs"),
      import("node:path"),
      import("./seed"),
    ]);
    const databaseFile = process.env.NIVAS_DB_PATH ?? path.join(process.cwd(), ".data", "nivas.db");
    const db = new LocalDatabase(databaseFile);
    const migrationsDir = path.join(process.cwd(), "migrations");
    if (fs.existsSync(migrationsDir)) {
      const sql = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort()
        .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
        .join("\n");
      db.raw().exec(sql);
    }
    globalForDb.__nivasDb = db;
    await seedDatabase(db);
  }
  return globalForDb.__nivasDb;
}

export async function getDb(): Promise<Database> {
  if (!globalForDb.__nivasDbReady) {
    globalForDb.__nivasDbReady = init();
  }
  return globalForDb.__nivasDbReady;
}

export async function resetLocalDatabase() {
  const [{ default: fs }, { default: path }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);
  const file = process.env.NIVAS_DB_PATH ?? path.join(process.cwd(), ".data", "nivas.db");
  globalForDb.__nivasDb = undefined;
  globalForDb.__nivasDbReady = undefined;
  for (const suffix of ["", "-wal", "-shm"]) {
    const target = file + suffix;
    if (fs.existsSync(target)) fs.rmSync(target);
  }
  await getDb();
}
