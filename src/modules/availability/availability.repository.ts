import type { Database } from "@/db/database";
import { nowIso, todayISO } from "@/lib/date";
import { unavailable } from "@/lib/errors";

export type NightState = "booked" | "held" | "blocked";

/**
 * Returns every night that cannot be sold in [from, to).
 * Held nights whose hold has expired are ignored here — the hold sweeper
 * deletes the rows before a new reservation is accepted.
 */
export async function getUnavailableNights(
  db: Database,
  propertyId: string,
  from: string,
  to: string,
): Promise<Map<string, NightState>> {
  const nights = new Map<string, NightState>();

  const booked = await db
    .prepare(
      `SELECT bn.stay_date, b.status, b.hold_expires_at
       FROM booking_nights bn
       JOIN bookings b ON b.id = bn.booking_id
       WHERE bn.property_id = ? AND bn.stay_date >= ? AND bn.stay_date < ?`,
    )
    .bind(propertyId, from, to)
    .all<{ stay_date: string; status: string; hold_expires_at: string | null }>();

  const now = nowIso();
  for (const row of booked) {
    if (row.status === "booked" || row.status === "completed") {
      nights.set(row.stay_date, "booked");
    } else if (row.status === "held" && (!row.hold_expires_at || row.hold_expires_at > now)) {
      nights.set(row.stay_date, "held");
    }
  }

  const blocks = await db
    .prepare(
      `SELECT start_date, end_date FROM availability_blocks
       WHERE property_id = ? AND end_date > ? AND start_date < ?`,
    )
    .bind(propertyId, from, to)
    .all<{ start_date: string; end_date: string }>();

  for (const block of blocks) {
    let cursor = new Date(`${block.start_date}T00:00:00.000Z`);
    const end = new Date(`${block.end_date}T00:00:00.000Z`);
    while (cursor < end) {
      const date = cursor.toISOString().slice(0, 10);
      if (date >= from && date < to && !nights.has(date)) nights.set(date, "blocked");
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }

  return nights;
}

export async function listBookedDates(db: Database, propertyId: string, from: string, to: string) {
  const nights = await getUnavailableNights(db, propertyId, from, to);
  return [...nights.entries()]
    .filter(([, state]) => state !== "blocked")
    .map(([date]) => date)
    .sort();
}

/**
 * Server-side availability assertion. Availability shown in the UI is only a
 * hint; this runs again immediately before a hold is inserted.
 */
export async function assertRangeAvailable(
  db: Database,
  propertyId: string,
  checkIn: string,
  checkOut: string,
  nights: string[],
) {
  const blocked = await getUnavailableNights(db, propertyId, checkIn, checkOut);
  const conflict = nights.find((night) => blocked.has(night));
  if (conflict) {
    const state = blocked.get(conflict);
    throw unavailable(
      state === "blocked"
        ? "The host has blocked these dates. Please choose different dates."
        : "Sorry — those dates are no longer available.",
      { [conflict]: state ?? "unavailable" },
    );
  }
}

export async function getCalendar(
  db: Database,
  propertyId: string,
  from: string,
  to: string,
): Promise<Record<string, NightState>> {
  const nights = await getUnavailableNights(db, propertyId, from, to);
  return Object.fromEntries(nights.entries());
}

export function defaultCalendarWindow() {
  const from = todayISO().slice(0, 7) + "-01";
  const start = new Date(`${from}T00:00:00.000Z`);
  start.setUTCMonth(start.getUTCMonth() + 3);
  return { from, to: start.toISOString().slice(0, 10) };
}
