import type { Database } from "@/db/database";
import { newId } from "@/lib/ids";
import { nowIso, todayISO } from "@/lib/date";
import { auditStatement } from "@/modules/admin/audit";
import { listExpiredHolds } from "./booking.repository";
import { createProviderRefund } from "@/infrastructure/payments/razorpay";

export interface SweepResult {
  released: number;
  reconciled: number;
}

/**
 * Releases expired holds.
 *
 * Every statement is guarded on `status = 'held'`, so a booking that was
 * confirmed a moment before the sweep can never have its nights deleted.
 * Payments that succeeded after the hold expired are reconciled into refunds
 * instead of silently confirming a released booking.
 */
export async function releaseExpiredHolds(
  db: Database,
  options: { propertyId?: string } = {},
): Promise<SweepResult> {
  const now = nowIso();
  const expired = await listExpiredHolds(db, now, options.propertyId);
  let released = 0;
  let reconciled = 0;

  for (const booking of expired) {
    await db.batch([
      db
        .prepare(
          "UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'held'",
        )
        .bind(now, booking.id),
      db
        .prepare(
          `DELETE FROM booking_nights
           WHERE booking_id = ?
             AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'expired')`,
        )
        .bind(booking.id, booking.id),
      db
        .prepare(
          "UPDATE payments SET status = 'expired', updated_at = ? WHERE booking_id = ? AND status IN ('created','pending')",
        )
        .bind(now, booking.id),
      // Conditional outbox: only emitted if the transition actually happened.
      db
        .prepare(
          `INSERT INTO outbox_events
             (id, type, aggregate_type, aggregate_id, payload, status, attempts, available_at, created_at)
           SELECT ?, 'booking.expired', 'booking', ?, ?, 'pending', 0, ?, ?
           WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'expired')`,
        )
        .bind(
          newId("evt"),
          booking.id,
          JSON.stringify({ bookingId: booking.id }),
          now,
          now,
          booking.id,
        ),
      auditStatement(db, {
        actorId: null,
        action: "booking.hold_expired",
        entityType: "booking",
        entityId: booking.id,
        metadata: "Automatic release after hold expiry",
      }),
    ]);
    released += 1;

    // A payment may have completed while the hold was expiring. Never confirm
    // a released booking — refund instead.
    const paid = await db
      .prepare("SELECT * FROM payments WHERE booking_id = ? AND status = 'paid'")
      .bind(booking.id)
      .first<{ id: string; provider_payment_id: string | null; amount: number }>();

    if (paid) {
      const refundId = newId("rfd");
      await db.batch([
        db
          .prepare(
            `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'Payment captured after hold expiry', 'pending', ?, ?)`,
          )
          .bind(refundId, paid.id, booking.id, paid.amount, now, now),
        db
          .prepare("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?")
          .bind(now, paid.id),
        db
          .prepare("UPDATE bookings SET payment_status = 'refunded', updated_at = ? WHERE id = ?")
          .bind(now, booking.id),
      ]);
      reconciled += 1;

      if (paid.provider_payment_id) {
        await createProviderRefund({
          paymentId: paid.provider_payment_id,
          amount: paid.amount,
          notes: { bookingId: booking.id, reason: "hold_expired" },
        })
          .then(async (result) => {
            await db
              .prepare("UPDATE refunds SET status = 'completed', provider_refund_id = ?, updated_at = ? WHERE id = ?")
              .bind(result.refundId, nowIso(), refundId)
              .run();
          })
          .catch(async (error) => {
            await db
              .prepare("UPDATE refunds SET status = 'failed', updated_at = ? WHERE id = ?")
              .bind(nowIso(), refundId)
              .run();
            console.error("[refund] provider call failed", error);
          });
      }
    }
  }

  return { released, reconciled };
}

/** Moves past confirmed stays to `completed` so reviews and payouts unlock. */
export async function completePastStays(db: Database): Promise<number> {
  const result = await db
    .prepare(
      "UPDATE bookings SET status = 'completed', updated_at = ? WHERE status = 'booked' AND check_out <= ?",
    )
    .bind(nowIso(), todayISO())
    .run();
  return result.changes;
}
