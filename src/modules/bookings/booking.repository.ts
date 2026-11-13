import type { Database } from "@/db/database";
import type { BookingNightRow, BookingRow, BookingWithProperty, PropertyRulesRow } from "@/db/types";
import { nowIso } from "@/lib/date";

const BOOKING_JOIN = `
  SELECT b.*,
         p.title AS property_title,
         p.slug AS property_slug,
         p.city AS property_city,
         p.state AS property_state,
         p.property_type,
         p.owner_id,
         (SELECT i.r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_key,
         (SELECT i.url   FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_url,
         u.full_name AS guest_name,
         u.email AS guest_email,
         ow.full_name AS owner_name
  FROM bookings b
  JOIN properties p ON p.id = b.property_id
  JOIN users u ON u.id = b.guest_id
  JOIN users ow ON ow.id = p.owner_id
`;

export async function findBookingById(db: Database, id: string) {
  return db.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first<BookingRow>();
}

export async function findBookingByCode(db: Database, code: string) {
  return db.prepare("SELECT * FROM bookings WHERE code = ?").bind(code).first<BookingRow>();
}

export async function findBookingWithProperty(db: Database, id: string) {
  return db.prepare(`${BOOKING_JOIN} WHERE b.id = ?`).bind(id).first<BookingWithProperty>();
}

export async function findBookingByPaymentOrder(db: Database, orderId: string) {
  return db
    .prepare(`${BOOKING_JOIN} WHERE b.id = (SELECT booking_id FROM payments WHERE provider_order_id = ?)`)
    .bind(orderId)
    .first<BookingWithProperty>();
}

export async function getRules(db: Database, propertyId: string) {
  return db
    .prepare("SELECT * FROM property_rules WHERE property_id = ?")
    .bind(propertyId)
    .first<PropertyRulesRow>();
}

export async function listGuestBookings(db: Database, guestId: string) {
  return db
    .prepare(`${BOOKING_JOIN} WHERE b.guest_id = ? ORDER BY b.check_in DESC`)
    .bind(guestId)
    .all<BookingWithProperty>();
}

export async function listOwnerBookings(db: Database, ownerId: string, limit = 100) {
  return db
    .prepare(`${BOOKING_JOIN} WHERE p.owner_id = ? ORDER BY b.check_in ASC LIMIT ?`)
    .bind(ownerId, limit)
    .all<BookingWithProperty>();
}

export async function listPropertyNights(db: Database, propertyId: string, from: string, to: string) {
  return db
    .prepare(
      "SELECT * FROM booking_nights WHERE property_id = ? AND stay_date >= ? AND stay_date < ? ORDER BY stay_date",
    )
    .bind(propertyId, from, to)
    .all<BookingNightRow>();
}

export async function countActiveHolds(db: Database, guestId: string, now: string) {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS total FROM bookings WHERE guest_id = ? AND status = 'held' AND hold_expires_at > ?",
    )
    .bind(guestId, now)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export async function listExpiredHolds(db: Database, now: string, propertyId?: string) {
  if (propertyId) {
    return db
      .prepare(
        "SELECT id, property_id FROM bookings WHERE status = 'held' AND hold_expires_at <= ? AND property_id = ? LIMIT 100",
      )
      .bind(now, propertyId)
      .all<{ id: string; property_id: string }>();
  }
  return db
    .prepare("SELECT id, property_id FROM bookings WHERE status = 'held' AND hold_expires_at <= ? LIMIT 100")
    .bind(now)
    .all<{ id: string; property_id: string }>();
}

export async function yesterdayIso() {
  return nowIso();
}
