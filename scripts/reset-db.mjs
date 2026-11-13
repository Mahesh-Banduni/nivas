#!/usr/bin/env node
/**
 * Reset the local development database.
 *
 *   npm run db:reset            # reset database and uploaded media
 *   npm run db:reset -- --keep-media
 *
 * Stop the dev server first: the local adapter keeps an open SQLite handle.
 * The next request re-applies migrations to an empty local database.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbFile = process.env.NIVAS_DB_PATH ?? path.join(root, ".data", "nivas.db");
const mediaDir = path.join(root, ".data", "media");
const keepMedia = process.argv.includes("--keep-media");

let removed = 0;
for (const suffix of ["", "-wal", "-shm"]) {
  const target = dbFile + suffix;
  if (fs.existsSync(target)) {
    fs.rmSync(target);
    removed += 1;
  }
}

if (!keepMedia && fs.existsSync(mediaDir)) {
  fs.rmSync(mediaDir, { recursive: true, force: true });
  removed += 1;
}

console.log(removed ? `Removed ${removed} local artefact(s).` : "Nothing to remove.");
console.log(`Database: ${dbFile}`);
console.log(keepMedia ? "Media: kept" : `Media:    ${mediaDir}`);
console.log("\nStart the app with `npm run dev` — migrations run automatically; no demo data is seeded.");
