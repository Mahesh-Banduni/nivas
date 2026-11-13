import { getDb } from "@/db";
import type { PaymentRow } from "@/db/types";
import { nowIso } from "@/lib/date";
import { AppError, badRequest, forbidden, notFound, unavailable } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { computeQuote, formatINR } from "@/lib/money";
import {
  createOrder,
  isRazorpayConfigured,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/infrastructure/payments/razorpay";
import { secret } from "@/infrastructure/cloudflare/env";
import { auditStatement } from "@/modules/admin/audit";
import { outboxStatement } from "@/modules/notifications/outbox";
import { findBookingById, findBookingWithProperty } from "@/modules/bookings/booking.repository";
import { releaseExpiredHolds } from "@/modules/bookings/hold-sweeper";
import { ensureBookingConversation } from "@/modules/messaging/messaging.service";
import {
  findLatestPaymentForBooking,
  findPaymentById,
  findPaymentByOrderId,
} from "./payment.repository";

export interface CheckoutSession {
  payment: PaymentRow;
  bookingId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  expiresAt: string | null;
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  method?: string;
  status?: string;
  captured?: boolean;
  error_code?: string;
  error_description?: string;
}

interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
  status?: string;
}

interface RazorpayOrderEntity {
  id: string;
  amount: number;
  amount_paid: number;
  status: string;
}

interface RazorpayWebhookBody {
  event?: string;
  id?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: RazorpayRefundEntity };
    order?: { entity?: RazorpayOrderEntity };
  };
}

/**
 * Creates (or reuses) the provider order for a held booking.
 * Idempotent: a second call returns the same order while it is still open.
 */
export async function ensureCheckoutSession(userId: string, bookingId: string): Promise<CheckoutSession> {
  const db = await getDb();

  let booking = await findBookingById(db, bookingId);
  if (!booking) throw notFound("Booking not found");
  if (booking.guest_id !== userId) throw forbidden("This booking belongs to someone else");

  if (booking.status === "held" && booking.hold_expires_at && booking.hold_expires_at <= nowIso()) {
    await releaseExpiredHolds(db, { propertyId: booking.property_id });
    booking = await findBookingById(db, bookingId);
  }

  if (!booking) throw notFound("Booking not found");
  if (booking.status !== "held") {
    throw unavailable(
      booking.status === "booked"
        ? "This booking is already confirmed."
        : "Your hold on these dates has expired. Please start a new reservation.",
    );
  }
  if (!isRazorpayConfigured()) {
    throw unavailable("Payments are not configured. Contact the site administrator.");
  }

  const existing = await findLatestPaymentForBooking(db, booking.id);
  if (
    existing &&
    existing.provider_order_id &&
    !existing.provider_order_id.startsWith("order_demo_") &&
    ["created", "pending", "authorized"].includes(existing.status)
  ) {
    return {
      payment: existing,
      bookingId: booking.id,
      orderId: existing.provider_order_id,
      amount: existing.amount,
      currency: existing.currency,
      keyId: secret("RAZORPAY_KEY_ID"),
      expiresAt: booking.hold_expires_at,
    };
  }

  const order = await createOrder({
    amount: booking.total_amount,
    currency: booking.currency,
    receipt: booking.code,
    notes: { bookingId: booking.id, propertyId: booking.property_id },
  });

  const payment: PaymentRow = {
    id: newId("pay"),
    booking_id: booking.id,
    provider: order.provider,
    provider_order_id: order.orderId,
    provider_payment_id: null,
    amount: booking.total_amount,
    currency: booking.currency,
    status: "pending",
    method: null,
    failure_reason: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await db.batch([
    db
      .prepare(
        `INSERT INTO payments
          (id, booking_id, provider, provider_order_id, provider_payment_id, amount, currency, status, method, failure_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, 'pending', NULL, NULL, ?, ?)`,
      )
      .bind(
        payment.id,
        payment.booking_id,
        payment.provider,
        payment.provider_order_id,
        payment.amount,
        payment.currency,
        payment.created_at,
        payment.updated_at,
      ),
    db
      .prepare("UPDATE bookings SET payment_status = 'pending', updated_at = ? WHERE id = ? AND status = 'held'")
      .bind(nowIso(), booking.id),
  ]);

  return {
    payment,
    bookingId: booking.id,
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    keyId: order.keyId,
    expiresAt: booking.hold_expires_at,
  };
}

export interface SettleResult {
  status: "confirmed" | "already_confirmed" | "needs_refund" | "failed";
  bookingId: string;
  message: string;
}

/**
 * Single place where money becomes a confirmed booking.
 * Guarded updates make it safe to call twice (webhook + redirect).
 */
export async function settlePayment(input: {
  paymentId: string;
  providerPaymentId: string;
  method?: string;
  eventId?: string;
}): Promise<SettleResult> {
  const db = await getDb();
  const payment = await findPaymentById(db, input.paymentId);
  if (!payment) throw notFound("Payment not found");
  const booking = await findBookingById(db, payment.booking_id);
  if (!booking) throw notFound("Booking not found");

  if (payment.amount !== booking.total_amount || payment.currency !== booking.currency) {
    throw badRequest("Payment amount does not match the reservation");
  }

  if (payment.status === "paid" && booking.status === "booked") {
    return {
      status: "already_confirmed",
      bookingId: booking.id,
      message: "Payment was already applied to this booking.",
    };
  }

  const now = nowIso();
  const quote = computeQuote({
    nightlyPrice: booking.nightly_price,
    cleaningFee: booking.cleaning_fee,
    nights: booking.nights,
  });
  const bookingConfirmed = `${payment.booking_id}`;

  await db.batch([
    db
      .prepare(
        `UPDATE payments SET status = 'paid', provider_payment_id = ?, method = ?, updated_at = ?
         WHERE id = ? AND status IN ('created','pending')`,
      )
      .bind(input.providerPaymentId, input.method ?? "card", now, payment.id),
    db
      .prepare(
        `UPDATE bookings SET status = 'booked', payment_status = 'paid', hold_expires_at = NULL, updated_at = ?
         WHERE id = ? AND status = 'held'`,
      )
      .bind(now, booking.id),
    db
      .prepare(
        `INSERT INTO commissions (id, booking_id, platform_fee, owner_amount, currency, created_at)
         SELECT ?, ?, ?, ?, 'INR', ?
         WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'booked')
           AND NOT EXISTS (SELECT 1 FROM commissions WHERE booking_id = ?)`,
      )
      .bind(newId("com"), booking.id, quote.platformFee, quote.ownerAmount, now, booking.id, booking.id),
    db
      .prepare(
        `INSERT INTO outbox_events
           (id, type, aggregate_type, aggregate_id, payload, status, attempts, available_at, created_at)
         SELECT ?, 'booking.confirmed', 'booking', ?, ?, 'pending', 0, ?, ?
         WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'booked')`,
      )
      .bind(
        newId("evt"),
        bookingConfirmed,
        JSON.stringify({ bookingId: booking.id, paymentId: payment.id }),
        now,
        now,
        booking.id,
      ),
    auditStatement(db, {
      actorId: booking.guest_id,
      action: "payment.captured",
      entityType: "booking",
      entityId: booking.id,
      metadata: `${formatINR(payment.amount)} via ${payment.provider}`,
    }),
  ]);

  const updated = await findBookingById(db, booking.id);

  // Payment captured after the hold was released: reconcile with a refund.
  if (updated?.status !== "booked") {
    const refundId = newId("rfd");
    await db.batch([
      db
        .prepare(
          `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Booking was no longer held when payment succeeded', 'pending', ?, ?)`,
        )
        .bind(refundId, payment.id, booking.id, payment.amount, now, now),
      db
        .prepare("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?")
        .bind(now, payment.id),
      db
        .prepare("UPDATE bookings SET payment_status = 'refunded', updated_at = ? WHERE id = ?")
        .bind(now, booking.id),
      outboxStatement(db, {
        type: "payment.refund_required",
        aggregateType: "booking",
        aggregateId: booking.id,
        payload: { bookingId: booking.id, paymentId: payment.id, amount: payment.amount },
      }),
    ]);
    return {
      status: "needs_refund",
      bookingId: booking.id,
      message: "The dates were released before payment completed. A full refund has been initiated.",
    };
  }

  const confirmedBooking = await findBookingWithProperty(db, booking.id);
  if (confirmedBooking) {
    await ensureBookingConversation(db, {
      id: confirmedBooking.id,
      property_id: confirmedBooking.property_id,
      property_title: confirmedBooking.property_title,
      owner_id: confirmedBooking.owner_id,
      guest_id: confirmedBooking.guest_id,
      code: confirmedBooking.code,
    });
  }

  return {
    status: "confirmed",
    bookingId: booking.id,
    message: `Booking confirmed. ${formatINR(payment.amount)} paid.`,
  };
}

export interface WebhookResult {
  received: true;
  duplicate?: boolean;
  handled?: string;
  error?: string;
}

/**
 * Razorpay webhook handler.
 * - verifies the signature over the raw body
 * - deduplicates by provider event id (unique index)
 * - validates amount/currency before confirming
 * - handles: payment.captured, payment.failed, refund.processed, order.paid, payment.authorized
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string | null,
  eventIdHeader: string | null,
): Promise<WebhookResult> {
  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new AppError("UNAUTHORIZED", "Invalid webhook signature");
  }

  const db = await getDb();
  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw badRequest("Malformed webhook body");
  }

  const eventId = eventIdHeader ?? body.id;
  const eventType = body.event ?? "unknown";
  if (!eventId) throw badRequest("Missing event id");

  const previousEvent = await db
    .prepare("SELECT id, processed_at FROM payment_events WHERE provider = 'razorpay' AND provider_event_id = ?")
    .bind(eventId)
    .first<{ id: string; processed_at: string | null }>();
  if (previousEvent?.processed_at) return { received: true, duplicate: true, handled: eventType };

  if (!previousEvent) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO payment_events (id, provider, provider_event_id, event_type, payload, created_at) VALUES (?, 'razorpay', ?, ?, ?, ?)",
      )
      .bind(newId("pev"), eventId, eventType, rawBody.slice(0, 20_000), nowIso())
      .run();
  }

  let handled = eventType;
  const paymentEntity = body.payload?.payment?.entity;
  const refundEntity = body.payload?.refund?.entity;
  const orderEntity = body.payload?.order?.entity;

  switch (eventType) {
    case "payment.captured":
      handled = await handlePaymentCaptured(db, paymentEntity, eventId);
      break;

    case "payment.authorized":
      handled = await handlePaymentAuthorized(db, paymentEntity, eventId);
      break;

    case "payment.failed":
      handled = await handlePaymentFailed(db, paymentEntity, eventId);
      break;

    case "refund.processed":
      handled = await handleRefundProcessed(db, refundEntity, eventId);
      break;

    case "order.paid":
      handled = await handleOrderPaid(db, orderEntity, eventId);
      break;

    default:
      handled = `unhandled:${eventType}`;
  }

  await db
    .prepare("UPDATE payment_events SET processed_at = ? WHERE provider = 'razorpay' AND provider_event_id = ?")
    .bind(nowIso(), eventId)
    .run();

  return { received: true, handled };
}

async function handlePaymentCaptured(
  db: Awaited<ReturnType<typeof getDb>>,
  paymentEntity: RazorpayPaymentEntity | undefined,
  eventId: string,
): Promise<string> {
  if (!paymentEntity) return "payment.captured:no_entity";

  const payment = await findPaymentByOrderId(db, paymentEntity.order_id);
  if (!payment) return "payment.captured:unknown_order";

  // Verify amount matches (in paise)
  if (payment.amount !== paymentEntity.amount) {
    await db
      .prepare("UPDATE payments SET status = 'failed', failure_reason = 'Amount mismatch', updated_at = ? WHERE id = ?")
      .bind(nowIso(), payment.id)
      .run();
    return "payment.captured:amount_mismatch";
  }

  // Verify currency
  if (payment.currency !== paymentEntity.currency) {
    await db
      .prepare("UPDATE payments SET status = 'failed', failure_reason = 'Currency mismatch', updated_at = ? WHERE id = ?")
      .bind(nowIso(), payment.id)
      .run();
    return "payment.captured:currency_mismatch";
  }

  const result = await settlePayment({
    paymentId: payment.id,
    providerPaymentId: paymentEntity.id,
    method: paymentEntity.method,
    eventId,
  });

  return `payment.captured:${result.status}`;
}

async function handlePaymentAuthorized(
  db: Awaited<ReturnType<typeof getDb>>,
  paymentEntity: RazorpayPaymentEntity | undefined,
  eventId: string,
): Promise<string> {
  if (!paymentEntity) return "payment.authorized:no_entity";

  const payment = await findPaymentByOrderId(db, paymentEntity.order_id);
  if (!payment) return "payment.authorized:unknown_order";

  // For authorized payments, update status but don't confirm booking yet
  // (will be confirmed on payment.captured)
  await db
    .prepare(
      `UPDATE payments SET 
         provider_payment_id = ?, 
         status = 'authorized', 
         method = ?, 
         updated_at = ? 
       WHERE id = ? AND status IN ('created','pending')`,
    )
    .bind(paymentEntity.id, paymentEntity.method ?? "card", nowIso(), payment.id)
    .run();

  return "payment.authorized";
}

async function handlePaymentFailed(
  db: Awaited<ReturnType<typeof getDb>>,
  paymentEntity: RazorpayPaymentEntity | undefined,
  eventId: string,
): Promise<string> {
  if (!paymentEntity) return "payment.failed:no_entity";

  const payment = await findPaymentByOrderId(db, paymentEntity.order_id);
  if (!payment) return "payment.failed:unknown_order";

  const errorCode = paymentEntity.error_code ?? "unknown";
  const errorDesc = paymentEntity.error_description ?? "Provider reported failure";

  await db
    .prepare(
      "UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ? AND status != 'paid'",
    )
    .bind(`${errorCode}: ${errorDesc}`, nowIso(), payment.id)
    .run();

  // Release hold if payment failed
  await db
    .prepare(
      `UPDATE bookings SET status = 'cancelled', payment_status = 'failed', hold_expires_at = NULL, updated_at = ?
       WHERE id = ? AND status = 'held'`,
    )
    .bind(nowIso(), payment.booking_id)
    .run();

  return `payment.failed:${errorCode}`;
}

async function handleRefundProcessed(
  db: Awaited<ReturnType<typeof getDb>>,
  refundEntity: RazorpayRefundEntity | undefined,
  eventId: string,
): Promise<string> {
  if (!refundEntity) return "refund.processed:no_entity";

  await db
    .prepare("UPDATE refunds SET status = 'completed', provider_refund_id = ?, updated_at = ? WHERE provider_refund_id = ?")
    .bind(refundEntity.id, nowIso(), refundEntity.id)
    .run();

  // Also update payment status
  await db
    .prepare("UPDATE payments SET status = 'refunded', updated_at = ? WHERE provider_payment_id = ?")
    .bind(nowIso(), refundEntity.payment_id)
    .run();

  return "refund.processed";
}

async function handleOrderPaid(
  db: Awaited<ReturnType<typeof getDb>>,
  orderEntity: RazorpayOrderEntity | undefined,
  eventId: string,
): Promise<string> {
  if (!orderEntity) return "order.paid:no_entity";

  // Find payment by order ID
  const payment = await findPaymentByOrderId(db, orderEntity.id);
  if (!payment) return "order.paid:unknown_order";

  // If order is fully paid but payment not yet captured, this is a safety net
  if (orderEntity.amount_paid >= orderEntity.amount && payment.status !== "paid") {
    // The payment.captured webhook should handle this, but we log it
    return "order.paid:payment_not_captured_yet";
  }

  return "order.paid";
}

export async function getCheckoutContext(userId: string, bookingId: string) {
  const db = await getDb();
  const booking = await findBookingWithProperty(db, bookingId);
  if (!booking) throw notFound("Booking not found");
  if (booking.guest_id !== userId) throw forbidden();
  return booking;
}

/**
 * Create a provider refund for a payment
 */
export async function createRefund(input: {
  paymentId: string;
  amount: number;
  reason: string;
  notes?: Record<string, string>;
}): Promise<{ refundId: string }> {
  const db = await getDb();
  const payment = await findPaymentById(db, input.paymentId);
  if (!payment) throw notFound("Payment not found");
  if (payment.status !== "paid") throw badRequest("Cannot refund unpaid payment");

  const { createProviderRefund } = await import("@/infrastructure/payments/razorpay");
  const result = await createProviderRefund({
    paymentId: payment.provider_payment_id!,
    amount: input.amount,
    notes: input.notes,
  });

  const refundId = newId("rfd");
  const now = nowIso();

  await db.batch([
    db
      .prepare(
        `INSERT INTO refunds (id, payment_id, booking_id, amount, reason, provider_refund_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .bind(refundId, payment.id, payment.booking_id, input.amount, input.reason, result.refundId, now, now),
    db
      .prepare("UPDATE payments SET status = 'refund_pending', updated_at = ? WHERE id = ?")
      .bind(now, payment.id),
    db
      .prepare("UPDATE bookings SET payment_status = 'refund_pending', updated_at = ? WHERE id = ?")
      .bind(now, payment.booking_id),
  ]);

  return { refundId: result.refundId };
}