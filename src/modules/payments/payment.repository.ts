import type { Database } from "@/db/database";
import type { PaymentRow, RefundRow } from "@/db/types";

export async function findPaymentById(db: Database, id: string) {
  return db.prepare("SELECT * FROM payments WHERE id = ?").bind(id).first<PaymentRow>();
}

export async function findLatestPaymentForBooking(db: Database, bookingId: string) {
  return db
    .prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(bookingId)
    .first<PaymentRow>();
}

export async function findPaymentByOrderId(db: Database, orderId: string) {
  return db
    .prepare("SELECT * FROM payments WHERE provider_order_id = ?")
    .bind(orderId)
    .first<PaymentRow>();
}

export async function listPayments(db: Database, limit = 100) {
  return db
    .prepare(
      `SELECT pay.*, b.code AS booking_code, b.check_in, b.check_out, p.title AS property_title,
              u.full_name AS guest_name
       FROM payments pay
       JOIN bookings b ON b.id = pay.booking_id
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.guest_id
       ORDER BY pay.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<
      PaymentRow & {
        booking_code: string;
        check_in: string;
        check_out: string;
        property_title: string;
        guest_name: string;
      }
    >();
}

export async function listRefunds(db: Database, limit = 50) {
  return db
    .prepare(
      `SELECT r.*, b.code AS booking_code, p.title AS property_title, u.full_name AS guest_name
       FROM refunds r
       JOIN bookings b ON b.id = r.booking_id
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.guest_id
       ORDER BY r.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<RefundRow & { booking_code: string; property_title: string; guest_name: string }>();
}

export async function findPaymentEvent(db: Database, provider: string, eventId: string) {
  return db
    .prepare("SELECT * FROM payment_events WHERE provider = ? AND provider_event_id = ?")
    .bind(provider, eventId)
    .first<{ id: string; processed_at: string | null }>();
}
