import { getDb } from "@/db";
import type { Database } from "@/db/database";
import { nowIso, todayISO } from "@/lib/date";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { auditStatement } from "@/modules/admin/audit";
import { outboxStatement } from "@/modules/notifications/outbox";

export async function listPropertyReviews(db: Database, propertyId: string, limit = 20) {
  return db
    .prepare(
      `SELECT r.*, u.full_name AS guest_name, u.avatar_color
       FROM reviews r JOIN users u ON u.id = r.guest_id
       WHERE r.property_id = ? AND r.status = 'published'
       ORDER BY r.created_at DESC LIMIT ?`,
    )
    .bind(propertyId, limit)
    .all<{
      id: string;
      rating: number;
      comment: string | null;
      cleanliness: number | null;
      accuracy: number | null;
      communication: number | null;
      location: number | null;
      value: number | null;
      created_at: string;
      guest_name: string;
      avatar_color: string;
    }>();
}

export async function createReview(input: {
  guestId: string;
  bookingId: string;
  rating: number;
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  value: number;
  comment: string;
}) {
  const db = await getDb();
  const booking = await db
    .prepare(
      `SELECT b.*, p.title AS property_title, p.owner_id, p.slug AS property_slug
       FROM bookings b JOIN properties p ON p.id = b.property_id WHERE b.id = ?`,
    )
    .bind(input.bookingId)
    .first<{
      id: string;
      guest_id: string;
      property_id: string;
      property_title: string;
      property_slug: string;
      owner_id: string;
      status: string;
      check_out: string;
    }>();

  if (!booking) throw notFound("Booking not found");
  if (booking.guest_id !== input.guestId) throw forbidden("You can only review your own stays");
  const stayed = booking.status === "completed" || booking.check_out <= todayISO();
  if (!stayed) throw badRequest("You can review a stay after check-out");

  const existing = await db
    .prepare("SELECT id FROM reviews WHERE booking_id = ?")
    .bind(booking.id)
    .first<{ id: string }>();
  if (existing) throw badRequest("You have already reviewed this stay");

  const now = nowIso();
  const reviewId = newId("rev");
  await db.batch([
    db
      .prepare(
        `INSERT INTO reviews
          (id, property_id, booking_id, guest_id, rating, cleanliness, accuracy, communication, location, value, comment, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
      )
      .bind(
        reviewId,
        booking.property_id,
        booking.id,
        input.guestId,
        input.rating,
        input.cleanliness,
        input.accuracy,
        input.communication,
        input.location,
        input.value,
        input.comment,
        now,
      ),
    db
      .prepare(
        `UPDATE properties SET
           rating_avg = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE property_id = ? AND status = 'published'),
           rating_count = (SELECT COUNT(*) FROM reviews WHERE property_id = ? AND status = 'published')
         WHERE id = ?`,
      )
      .bind(booking.property_id, booking.property_id, booking.property_id),
    outboxStatement(db, {
      type: "review.published",
      aggregateType: "review",
      aggregateId: reviewId,
      payload: {
        reviewId,
        ownerId: booking.owner_id,
        propertyTitle: booking.property_title,
        rating: input.rating,
      },
    }),
    auditStatement(db, {
      actorId: input.guestId,
      action: "review.published",
      entityType: "review",
      entityId: reviewId,
      metadata: `${input.rating}/5 for ${booking.property_title}`,
    }),
  ]);

  return { reviewId, propertySlug: booking.property_slug };
}

export async function setReviewVisibility(reviewId: string, status: "published" | "hidden") {
  const db = await getDb();
  const review = await db
    .prepare("SELECT property_id FROM reviews WHERE id = ?")
    .bind(reviewId)
    .first<{ property_id: string }>();
  if (!review) throw notFound("Review not found");
  await db.batch([
    db.prepare("UPDATE reviews SET status = ? WHERE id = ?").bind(status, reviewId),
    db
      .prepare(
        `UPDATE properties SET
           rating_avg = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE property_id = ? AND status = 'published'), 0),
           rating_count = (SELECT COUNT(*) FROM reviews WHERE property_id = ? AND status = 'published')
         WHERE id = ?`,
      )
      .bind(review.property_id, review.property_id, review.property_id),
  ]);
}

export async function reviewsForOwner(db: Database, ownerId: string, limit = 6) {
  return db
    .prepare(
      `SELECT r.*, p.title AS property_title, u.full_name AS guest_name, u.avatar_color
       FROM reviews r
       JOIN properties p ON p.id = r.property_id
       JOIN users u ON u.id = r.guest_id
       WHERE p.owner_id = ? AND r.status = 'published'
       ORDER BY r.created_at DESC LIMIT ?`,
    )
    .bind(ownerId, limit)
    .all<{
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      property_title: string;
      guest_name: string;
      avatar_color: string;
    }>();
}
