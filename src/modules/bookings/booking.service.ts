import { getDb } from "@/db";
import { UniqueConstraintError } from "@/db/database";
import type { BookingRow, BookingWithProperty } from "@/db/types";
import { addDays, eachNight, nowIso, todayISO } from "@/lib/date";
import { badRequest, forbidden, notFound, unavailable } from "@/lib/errors";
import { bookingCode, newId } from "@/lib/ids";
import { HOLD_MINUTES, computeQuote } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { assertRangeAvailable } from "@/modules/availability/availability.repository";
import { findPropertyById } from "@/modules/properties/property.repository";
import { auditStatement } from "@/modules/admin/audit";
import { outboxStatement } from "@/modules/notifications/outbox";
import { createProviderRefund } from "@/infrastructure/payments/razorpay";
import {
  countActiveHolds,
  findBookingById,
  findBookingWithProperty,
  getRules,
  listGuestBookings,
  listOwnerBookings,
} from "./booking.repository";
import { calculateRefund, validateStay } from "./pricing";
import { releaseExpiredHolds } from "./hold-sweeper";

export interface StayRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

const MAX_ACTIVE_HOLDS = 3;

/** Public price/availability quote. Used by the booking widget and detail page. */
export async function quoteStay(request: StayRequest) {
  const db = await getDb();
  const property = await findPropertyById(db, request.propertyId);
  if (!property || property.status !== "published") throw notFound("Property not found");
  const rules = await getRules(db, property.id);
  const { nights, quote } = validateStay(property, rules, request.checkIn, request.checkOut, request.guests);
  return { property, rules, nights, quote };
}

export interface HoldResult {
  bookingId: string;
  code: string;
  expiresAt: string;
  total: number;
  nights: number;
}

/**
 * Atomically reserves every night of the stay.
 *
 * Correctness rests on two things:
 *   1. `booking_nights` has PRIMARY KEY (property_id, stay_date)
 *   2. the insert of the booking and all nights runs in one atomic batch
 * A concurrent request for an overlapping night fails the unique constraint
 * and rolls the whole batch back.
 */
export async function createHold(userId: string, request: StayRequest): Promise<HoldResult> {
  const db = await getDb();

  const property = await findPropertyById(db, request.propertyId);
  if (!property || property.status !== "published") throw notFound("Property not found");
  if (property.owner_id === userId) {
    throw badRequest("You cannot book your own listing");
  }

  const rules = await getRules(db, property.id);
  const { quote } = validateStay(property, rules, request.checkIn, request.checkOut, request.guests);
  const nights = eachNight(request.checkIn, request.checkOut);
  if (nights.length !== quote.nights) {
    throw badRequest("Invalid stay dates");
  }

  const activeHolds = await countActiveHolds(db, userId, nowIso());
  if (activeHolds >= MAX_ACTIVE_HOLDS) {
    throw new AppError(
      "RATE_LIMITED",
      "You already have several stays on hold. Complete or release one before starting another.",
    );
  }

  // Expired holds still occupy booking_nights rows until they are swept. Clear
  // them for this property before evaluating availability.
  await releaseExpiredHolds(db, { propertyId: property.id });

  // Authoritative availability check (UI availability is only a hint).
  await assertRangeAvailable(db, property.id, request.checkIn, request.checkOut, nights);

  const bookingId = newId("bkg");
  const code = bookingCode();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO bookings
            (id, code, property_id, guest_id, check_in, check_out, nights, guests,
             nightly_price, subtotal, cleaning_fee, service_fee, tax_amount, total_amount, currency,
             status, payment_status, hold_expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'held', 'unpaid', ?, ?, ?)`,
        )
        .bind(
          bookingId,
          code,
          property.id,
          userId,
          request.checkIn,
          request.checkOut,
          nights.length,
          request.guests,
          property.nightly_price,
          quote.subtotal,
          quote.cleaningFee,
          quote.serviceFee,
          quote.taxAmount,
          quote.total,
          expiresAt,
          now,
          now,
        ),
      ...nights.map((date) =>
        db
          .prepare("INSERT INTO booking_nights (property_id, stay_date, booking_id) VALUES (?, ?, ?)")
          .bind(property.id, date, bookingId),
      ),
    ]);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw unavailable(
        "Another guest just reserved one of these nights. Please pick different dates.",
      );
    }
    throw error;
  }

  return { bookingId, code, expiresAt, total: quote.total, nights: nights.length };
}

export async function getBookingForUser(userId: string, roles: string[], bookingId: string) {
  const db = await getDb();
  const booking = await findBookingWithProperty(db, bookingId);
  if (!booking) throw notFound("Booking not found");
  const allowed = booking.guest_id === userId || booking.owner_id === userId || roles.includes("admin");
  if (!allowed) throw forbidden("This booking belongs to someone else");
  return booking;
}

export async function listMyBookings(userId: string) {
  const db = await getDb();
  return listGuestBookings(db, userId);
}

export async function listOwnerReservations(ownerId: string) {
  const db = await getDb();
  return listOwnerBookings(db, ownerId);
}

/** Releases a held booking immediately (guest abandoned checkout). */
export async function releaseHold(userId: string, bookingId: string) {
  const db = await getDb();
  const booking = await findBookingById(db, bookingId);
  if (!booking) throw notFound("Booking not found");
  if (booking.guest_id !== userId) throw forbidden();
  if (booking.status !== "held") return;

  await db.batch([
    db
      .prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'held'")
      .bind(nowIso(), booking.id),
    db
      .prepare(
        `DELETE FROM booking_nights WHERE booking_id = ?
           AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'expired')`,
      )
      .bind(booking.id, booking.id),
  ]);
}

export interface CancelResult {
  status: string;
  refund: number;
  policy: string;
}

export async function cancelBooking(input: {
  actorId: string;
  roles: string[];
  bookingId: string;
  reason?: string;
}): Promise<CancelResult> {
  const db = await getDb();
  const booking = await findBookingWithProperty(db, input.bookingId);
  if (!booking) throw notFound("Booking not found");

  const isGuest = booking.guest_id === input.actorId;
  const isOwner = booking.owner_id === input.actorId;
  if (!isGuest && !isOwner && !input.roles.includes("admin")) throw forbidden();

  if (!["held", "booked"].includes(booking.status)) {
    throw badRequest("This booking can no longer be cancelled");
  }

  const rules = await getRules(db, booking.property_id);
  const policy = rules?.cancellation_policy ?? "moderate";
  const now = nowIso();

  if (booking.status === "held") {
    await db.batch([
      db
        .prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'held'")
        .bind(now, booking.id),
      db
        .prepare(
          `DELETE FROM booking_nights WHERE booking_id = ?
             AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'expired')`,
        )
        .bind(booking.id, booking.id),
      auditStatement(db, {
        actorId: input.actorId,
        action: "booking.hold_released",
        entityType: "booking",
        entityId: booking.id,
        metadata: input.reason ?? "Released before payment",
      }),
    ]);
    return { status: "expired", refund: 0, policy };
  }

  const refund = calculateRefund(booking, policy);
  const payment = await db
    .prepare("SELECT * FROM payments WHERE booking_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 1")
    .bind(booking.id)
    .first<{ id: string; provider_payment_id: string | null; amount: number }>();

  const paymentStatus =
    refund.amount >= booking.total_amount
      ? "refunded"
      : refund.amount > 0
        ? "partially_refunded"
        : booking.payment_status;

  const refundId = newId("rfd");
  await db.batch([
    db
      .prepare(
        `UPDATE bookings
         SET status = 'cancelled', payment_status = ?, cancelled_at = ?, cancellation_reason = ?, updated_at = ?
         WHERE id = ? AND status = 'booked'`,
      )
      .bind(paymentStatus, now, input.reason ?? "Cancelled", now, booking.id),
    db
      .prepare(
        `DELETE FROM booking_nights WHERE booking_id = ?
           AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'cancelled')`,
      )
      .bind(booking.id, booking.id),
    ...(payment && refund.amount > 0
      ? [
          db
            .prepare(
              `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'processing', ?, ?)`,
            )
            .bind(
              refundId,
              payment.id,
              booking.id,
              refund.amount,
              input.reason ?? "Guest cancellation",
              now,
              now,
            ),
        ]
      : []),
    outboxStatement(db, {
      type: "booking.cancelled",
      aggregateType: "booking",
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        refundAmount: refund.amount,
        cancelledBy: isOwner ? "owner" : "guest",
      },
    }),
    auditStatement(db, {
      actorId: input.actorId,
      action: "booking.cancelled",
      entityType: "booking",
      entityId: booking.id,
      metadata: `${refund.label} (${policy})`,
    }),
  ]);

  // Provider call happens after commit — never inside the transaction.
  if (payment && refund.amount > 0) {
    if (payment.provider_payment_id) {
      try {
        const result = await createProviderRefund({
          paymentId: payment.provider_payment_id,
          amount: refund.amount,
          notes: { bookingId: booking.id, reason: input.reason ?? "guest_cancellation" },
        });
        await db
          .prepare(
            "UPDATE refunds SET status = 'completed', provider_refund_id = ?, updated_at = ? WHERE id = ?",
          )
          .bind(result.refundId, nowIso(), refundId)
          .run();
      } catch (error) {
        await db
          .prepare("UPDATE refunds SET status = 'failed', updated_at = ? WHERE id = ?")
          .bind(nowIso(), refundId)
          .run();
        console.error("[refund] provider call failed", error);
      }
    }
  }

  return { status: "cancelled", refund: refund.amount, policy };
}

export async function getBookingTimeline(booking: BookingWithProperty) {
  const db = await getDb();
  const [payments, refunds, logs] = await Promise.all([
    db
      .prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at ASC")
      .bind(booking.id)
      .all<{ id: string; status: string; amount: number; method: string | null; created_at: string }>(),
    db
      .prepare("SELECT * FROM refunds WHERE booking_id = ? ORDER BY created_at ASC")
      .bind(booking.id)
      .all<{ id: string; status: string; amount: number; created_at: string }>(),
    db
      .prepare(
        "SELECT * FROM audit_logs WHERE entity_id = ? AND entity_type = 'booking' ORDER BY created_at ASC",
      )
      .bind(booking.id)
      .all<{ id: string; action: string; metadata: string | null; created_at: string }>(),
  ]);
  return { payments, refunds, logs };
}

export function suggestedDates(nights = 3) {
  const start = addDays(todayISO(), 14);
  return { checkIn: start, checkOut: addDays(start, nights) };
}

export { computeQuote };
