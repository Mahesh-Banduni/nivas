import { getDb } from "@/db";
import type { BookingWithProperty } from "@/db/types";
import { addDays, nowIso, todayISO } from "@/lib/date";
import { fillSeries, monthKeysBack } from "@/lib/analytics";
import { listOwnerProperties } from "@/modules/properties/property.repository";
import { listOwnerBookings } from "@/modules/bookings/booking.repository";
import { listConversations } from "@/modules/messaging/messaging.service";
import { reviewsForOwner } from "@/modules/reviews/review.service";

export async function getOwnerDashboard(ownerId: string) {
  const db = await getDb();
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const months = monthKeysBack(6, today);
  const windowStart = months[0] + "-01";
  const in30 = addDays(today, 30);

  const [totals, monthTotals, monthlyRows, occupancy, properties, upcoming, reviews, payouts, conversations, pendingHolds] =
    await Promise.all([
      db
        .prepare(
          `SELECT COALESCE(SUM(c.owner_amount),0) AS revenue, COUNT(*) AS bookings
           FROM commissions c
           JOIN bookings b ON b.id = c.booking_id
           JOIN properties p ON p.id = b.property_id
           WHERE p.owner_id = ? AND b.status IN ('booked','completed')`,
        )
        .bind(ownerId)
        .first<{ revenue: number; bookings: number }>(),
      db
        .prepare(
          `SELECT COALESCE(SUM(c.owner_amount),0) AS revenue, COUNT(*) AS bookings
           FROM commissions c
           JOIN bookings b ON b.id = c.booking_id
           JOIN properties p ON p.id = b.property_id
           WHERE p.owner_id = ? AND b.status IN ('booked','completed') AND b.created_at >= ?`,
        )
        .bind(ownerId, monthStart)
        .first<{ revenue: number; bookings: number }>(),
      db
        .prepare(
          `SELECT substr(b.created_at, 1, 7) AS month, SUM(c.owner_amount) AS value
           FROM commissions c
           JOIN bookings b ON b.id = c.booking_id
           JOIN properties p ON p.id = b.property_id
           WHERE p.owner_id = ? AND b.status IN ('booked','completed') AND b.created_at >= ?
           GROUP BY month ORDER BY month`,
        )
        .bind(ownerId, windowStart)
        .all<{ month: string; value: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS booked_nights
           FROM booking_nights bn
           JOIN bookings b ON b.id = bn.booking_id
           JOIN properties p ON p.id = bn.property_id
           WHERE p.owner_id = ? AND b.status = 'booked'
             AND bn.stay_date >= ? AND bn.stay_date < ?`,
        )
        .bind(ownerId, today, in30)
        .first<{ booked_nights: number }>(),
      listOwnerProperties(db, ownerId),
      listOwnerBookings(db, ownerId, 40),
      reviewsForOwner(db, ownerId, 4),
      db
        .prepare("SELECT * FROM payouts WHERE owner_id = ? ORDER BY created_at DESC LIMIT 4")
        .bind(ownerId)
        .all<{ id: string; amount: number; status: string; period_start: string; period_end: string; created_at: string }>(),
      listConversations(db, ownerId),
      db
        .prepare(
          `SELECT COUNT(*) AS total FROM bookings b JOIN properties p ON p.id = b.property_id
           WHERE p.owner_id = ? AND b.status = 'held' AND b.hold_expires_at > ?`,
        )
        .bind(ownerId, nowIso())
        .first<{ total: number }>(),
    ]);

  const published = properties.filter((property) => property.status === "published");
  const bookedNights = occupancy?.booked_nights ?? 0;
  const availableNights = Math.max(1, published.length * 30);
  const ratingValues = published.filter((property) => property.rating_count > 0);
  const avgRating = ratingValues.length
    ? ratingValues.reduce((sum, property) => sum + property.rating_avg, 0) / ratingValues.length
    : 0;

  const upcomingReservations = upcoming.filter(
    (booking: BookingWithProperty) => booking.check_in >= today && ["booked", "held"].includes(booking.status),
  );

  return {
    totals: totals ?? { revenue: 0, bookings: 0 },
    monthTotals: monthTotals ?? { revenue: 0, bookings: 0 },
    revenueSeries: fillSeries(monthlyRows, months),
    occupancy: Math.min(100, Math.round((bookedNights / availableNights) * 100)),
    properties,
    upcomingReservations,
    upcomingCount: upcomingReservations.length,
    reviews,
    payouts,
    conversations,
    activeHolds: pendingHolds?.total ?? 0,
    avgRating,
    publishedCount: published.length,
    unreadMessages: conversations.reduce((sum, conversation) => sum + conversation.unread, 0),
  };
}

export async function getOwnerEarnings(ownerId: string) {
  const db = await getDb();
  const today = todayISO();
  const months = monthKeysBack(6, today);
  const windowStart = months[0] + "-01";

  const [lifetime, monthly, payouts, nextPayout, commission] = await Promise.all([
    db
      .prepare(
        `SELECT COALESCE(SUM(c.owner_amount),0) AS revenue, COALESCE(SUM(c.platform_fee),0) AS fees, COUNT(*) AS bookings
         FROM commissions c
         JOIN bookings b ON b.id = c.booking_id
         JOIN properties p ON p.id = b.property_id
         WHERE p.owner_id = ? AND b.status IN ('booked','completed')`,
      )
      .bind(ownerId)
      .first<{ revenue: number; fees: number; bookings: number }>(),
    db
      .prepare(
        `SELECT substr(b.created_at, 1, 7) AS month, SUM(c.owner_amount) AS value
         FROM commissions c
         JOIN bookings b ON b.id = c.booking_id
         JOIN properties p ON p.id = b.property_id
         WHERE p.owner_id = ? AND b.status IN ('booked','completed') AND b.created_at >= ?
         GROUP BY month ORDER BY month`,
      )
      .bind(ownerId, windowStart)
      .all<{ month: string; value: number }>(),
    db
      .prepare(
        `SELECT * FROM payouts WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(ownerId)
      .all<{ id: string; amount: number; status: string; period_start: string; period_end: string; reference: string | null; paid_at: string | null; created_at: string }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) AS amount FROM payouts WHERE owner_id = ? AND status IN ('pending','scheduled')`,
      )
      .bind(ownerId)
      .first<{ amount: number }>(),
    db
      .prepare(
        `SELECT p.title, COUNT(*) AS bookings, COALESCE(SUM(c.owner_amount),0) AS revenue
         FROM commissions c
         JOIN bookings b ON b.id = c.booking_id
         JOIN properties p ON p.id = b.property_id
         WHERE p.owner_id = ? AND b.status IN ('booked','completed')
         GROUP BY p.id ORDER BY revenue DESC LIMIT 6`,
      )
      .bind(ownerId)
      .all<{ title: string; bookings: number; revenue: number }>(),
  ]);

  return {
    lifetime: lifetime ?? { revenue: 0, fees: 0, bookings: 0 },
    series: fillSeries(monthly, months),
    payouts,
    upcomingPayout: nextPayout?.amount ?? 0,
    byProperty: commission,
  };
}

export interface OwnerCalendarEntry {
  date: string;
  status: "booked" | "held" | "blocked";
  bookingId?: string;
  code?: string;
  guest?: string;
  property?: string;
}

export async function getOwnerCalendar(ownerId: string, from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT bn.stay_date, b.status, b.id AS booking_id, b.code, u.full_name AS guest, p.title AS property
       FROM booking_nights bn
       JOIN bookings b ON b.id = bn.booking_id
       JOIN properties p ON p.id = bn.property_id
       JOIN users u ON u.id = b.guest_id
       WHERE p.owner_id = ? AND bn.stay_date >= ? AND bn.stay_date < ?
         AND (b.status = 'booked' OR (b.status = 'held' AND b.hold_expires_at > ?))`,
    )
    .bind(ownerId, from, to, nowIso())
    .all<{
      stay_date: string;
      status: string;
      booking_id: string;
      code: string;
      guest: string;
      property: string;
    }>();

  const map: Record<string, OwnerCalendarEntry> = {};
  for (const row of rows) {
    map[row.stay_date] = {
      date: row.stay_date,
      status: row.status === "held" ? "held" : "booked",
      bookingId: row.booking_id,
      code: row.code,
      guest: row.guest,
      property: row.property,
    };
  }

  const blocks = await db
    .prepare(
      `SELECT ab.start_date, ab.end_date FROM availability_blocks ab
       JOIN properties p ON p.id = ab.property_id
       WHERE p.owner_id = ? AND ab.end_date > ? AND ab.start_date < ?`,
    )
    .bind(ownerId, from, to)
    .all<{ start_date: string; end_date: string }>();

  for (const block of blocks) {
    let cursor = new Date(`${block.start_date}T00:00:00.000Z`);
    const end = new Date(`${block.end_date}T00:00:00.000Z`);
    while (cursor < end) {
      const date = cursor.toISOString().slice(0, 10);
      if (date >= from && date < to && !map[date]) {
        map[date] = { date, status: "blocked" };
      }
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }

  return map;
}

export async function blockDates(ownerId: string, propertyId: string, startDate: string, endDate: string) {
  const db = await getDb();
  const property = await db
    .prepare("SELECT id FROM properties WHERE id = ? AND owner_id = ?")
    .bind(propertyId, ownerId)
    .first<{ id: string }>();
  if (!property) throw new Error("Listing not found");
  await db
    .prepare(
      "INSERT INTO availability_blocks (id, property_id, start_date, end_date, reason, created_at) VALUES (?, ?, ?, ?, 'owner_block', ?)",
    )
    .bind(`blk_${Date.now().toString(36)}`, propertyId, startDate, endDate, nowIso())
    .run();
}
