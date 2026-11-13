#!/usr/bin/env node
/**
 * Booking concurrency check.
 *
 * Two guests attempt overlapping holds on the same property at the same time.
 * The `booking_nights` table has PRIMARY KEY (property_id, stay_date), so the
 * losing transaction fails with a UNIQUE constraint and rolls back entirely.
 * Exactly one hold may succeed.
 *
 * The script builds a throwaway database from migrations/0001_init.sql and uses
 * two independent SQLite connections, mirroring two D1 requests arriving in
 * parallel. Exit code 1 means the invariant was violated.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const now = new Date().toISOString();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nivas-booking-"));
const dbPath = path.join(tmpDir, "booking-test.db");
const migration = fs.readFileSync(path.join(process.cwd(), "migrations", "0001_init.sql"), "utf8");

const setup = new DatabaseSync(dbPath);
setup.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 4000; PRAGMA foreign_keys = ON;");
setup.exec(migration);

setup
  .prepare(
    `INSERT INTO users (id, email, full_name, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  )
  .run("usr_owner_test", "owner-test@example.invalid", "Test Host", now, now);
setup
  .prepare(
    `INSERT INTO users (id, email, full_name, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  )
  .run("usr_guest_test", "guest-test@example.invalid", "Test Guest", now, now);
setup
  .prepare(
    `INSERT INTO properties
       (id, owner_id, slug, title, property_type, city, state, nightly_price,
        max_guests, bedrooms, beds, bathrooms, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'villa', 'Goa', 'Goa', 1200000, 4, 2, 2, 2, 'published', ?, ?)`,
  )
  .run("prp_concurrency", "usr_owner_test", "concurrency-villa", "Concurrency Villa", now, now);

function insertBooking(connection, id, code, checkIn, checkOut) {
  const nights = Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000,
  );
  connection.exec("BEGIN IMMEDIATE");
  try {
    connection
      .prepare(
        `INSERT INTO bookings
           (id, code, property_id, guest_id, check_in, check_out, nights, guests,
            nightly_price, subtotal, total_amount, status, hold_expires_at, created_at, updated_at)
         VALUES (?, ?, 'prp_concurrency', 'usr_guest_test', ?, ?, ?, 2,
                 1200000, ?, ?, 'held', ?, ?, ?)`,
      )
      .run(
        id,
        code,
        checkIn,
        checkOut,
        nights,
        1200000 * nights,
        1200000 * nights,
        new Date(Date.now() + 15 * 60_000).toISOString(),
        now,
        now,
      );

    const insertNight = connection.prepare(
      "INSERT INTO booking_nights (property_id, stay_date, booking_id) VALUES ('prp_concurrency', ?, ?)",
    );
    for (let offset = 0; offset < nights; offset += 1) {
      const stayDate = new Date(Date.parse(`${checkIn}T00:00:00Z`) + offset * 86_400_000)
        .toISOString()
        .slice(0, 10);
      insertNight.run(stayDate, id);
    }
    connection.exec("COMMIT");
    return { id, ok: true };
  } catch (error) {
    connection.exec("ROLLBACK");
    return { id, ok: false, error: String(error.message ?? error) };
  }
}

const guests = [
  new DatabaseSync(dbPath),
  new DatabaseSync(dbPath),
];
guests.forEach((connection) => connection.exec("PRAGMA busy_timeout = 4000; PRAGMA foreign_keys = ON;"));

// Overlapping window: 10-13 and 12-15 share the nights of the 12th.
const attempts = [
  { connection: guests[0], id: "bkg_hold_a", code: "NV-AAA111", checkIn: "2030-01-10", checkOut: "2030-01-13" },
  { connection: guests[1], id: "bkg_hold_b", code: "NV-BBB222", checkIn: "2030-01-12", checkOut: "2030-01-15" },
];

const results = await Promise.all(
  attempts.map(
    (attempt) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(insertBooking(attempt.connection, attempt.id, attempt.code, attempt.checkIn, attempt.checkOut)), 0);
      }),
  ),
);

const successes = results.filter((result) => result.ok);
const failures = results.filter((result) => !result.ok);
const nights = setup
  .prepare("SELECT stay_date, booking_id FROM booking_nights WHERE property_id = 'prp_concurrency' ORDER BY stay_date")
  .all();

console.log("Nivas booking concurrency check");
console.log("--------------------------------");
for (const result of results) {
  console.log(`${result.id}: ${result.ok ? "HELD" : "blocked"}${result.error ? ` (${result.error})` : ""}`);
}
console.log(`\nOccupied nights: ${nights.map((row) => `${row.stay_date}->${row.booking_id}`).join(", ") || "none"}`);
console.log(`Winners: ${successes.length}, blocked attempts: ${failures.length}`);

const invariantHolds = successes.length === 1 && failures.length === 1 && nights.length === 3;

setup.close();
for (const connection of guests) connection.close();
fs.rmSync(tmpDir, { recursive: true, force: true });

if (!invariantHolds) {
  console.error("\nFAIL: overlapping holds were both accepted (or neither was).");
  process.exit(1);
}
console.log("\nPASS: the composite primary key allowed exactly one hold.");
