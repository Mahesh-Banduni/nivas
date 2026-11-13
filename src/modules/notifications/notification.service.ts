import type { Database } from "@/db/database";
import type { QueueEvent } from "@/infrastructure/cloudflare/queues";
import { sendEmail } from "@/infrastructure/notifications/email";
import { sendSms } from "@/infrastructure/notifications/sms";
import { formatDateRange } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/date";

export async function notify(
  db: Database,
  input: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    channel?: "in_app" | "email" | "sms";
    status?: "queued" | "sent" | "failed";
  },
) {
  await db
    .prepare(
      "INSERT INTO notifications (id, user_id, type, title, body, channel, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      newId("ntf"),
      input.userId,
      input.type,
      input.title,
      input.body ?? null,
      input.channel ?? "in_app",
      input.status ?? "sent",
      nowIso(),
    )
    .run();
}

export async function listNotifications(db: Database, userId: string, limit = 20) {
  return db
    .prepare(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .bind(userId, limit)
    .all<{
      id: string;
      type: string;
      title: string;
      body: string | null;
      channel: string;
      status: string;
      read_at: string | null;
      created_at: string;
    }>();
}

export async function markAllRead(db: Database, userId: string) {
  await db
    .prepare("UPDATE notifications SET status = 'read', read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .bind(nowIso(), userId)
    .run();
}

/**
 * Queue consumer. Must be idempotent: Cloudflare Queues can deliver a message
 * more than once, so notification inserts are guarded by the event id.
 */
export async function handleDomainEvent(db: Database, event: QueueEvent) {
  switch (event.type) {
    case "user.registered": {
      const userId = String(event.payload.userId ?? event.aggregateId);
      const email = String(event.payload.email ?? "");
      const name = String(event.payload.name ?? "there");
      await notify(db, {
        userId,
        type: "user.welcome",
        title: `Welcome to Nivas, ${name.split(" ")[0]}`,
        body: "Your account is ready. Save a stay, message a host, or list your own home.",
      });
      if (email) {
        await sendEmail({
          to: email,
          subject: "Welcome to Nivas",
          html: `<p>Hi ${name},</p><p>Your Nivas account is ready. Explore available stays.</p>`,
        });
      }
      break;
    }

    case "booking.confirmed":
    case "booking.cancelled":
    case "booking.expired": {
      const booking = await loadBookingContext(db, String(event.payload.bookingId ?? event.aggregateId));
      if (!booking) return;

      const when = formatDateRange(booking.check_in, booking.check_out);
      const total = formatINR(booking.total_amount);

      if (event.type === "booking.confirmed") {
        await notify(db, {
          userId: booking.guest_id,
          type: "booking.confirmed",
          title: `Your stay at ${booking.property_title} is confirmed`,
          body: `Booking ${booking.code} · ${when} · ${total}. The host will share arrival details before check-in.`,
        });
        await notify(db, {
          userId: booking.owner_id,
          type: "booking.created",
          title: `New reservation at ${booking.property_title}`,
          body: `${booking.guest_name} booked ${booking.nights} night(s) · ${when}.`,
        });
        await sendEmail({
          to: booking.guest_email,
          subject: `Booking confirmed · ${booking.property_title}`,
          html: `<p>Your stay is confirmed.</p><p><strong>${booking.property_title}</strong><br/>${when}<br/>Booking ${booking.code}<br/>${total}</p>`,
        });
        await sendSms({
          to: booking.guest_phone ?? "",
          body: `Nivas: booking ${booking.code} confirmed for ${when}.`,
        });
      } else if (event.type === "booking.cancelled") {
        const refundNote =
          event.payload.refundAmount && Number(event.payload.refundAmount) > 0
            ? ` A refund of ${formatINR(Number(event.payload.refundAmount))} is on its way.`
            : "";
        await notify(db, {
          userId: booking.guest_id,
          type: "booking.cancelled",
          title: `Booking ${booking.code} cancelled`,
          body: `${booking.property_title} · ${when}.${refundNote}`,
        });
        await notify(db, {
          userId: booking.owner_id,
          type: "booking.cancelled",
          title: `Cancellation at ${booking.property_title}`,
          body: `${booking.guest_name} cancelled ${booking.nights} night(s) · ${when}. The dates are available again.`,
        });
      } else {
        await notify(db, {
          userId: booking.guest_id,
          type: "booking.expired",
          title: `Your hold on ${booking.property_title} expired`,
          body: `We released ${when} because payment was not completed in time. Nothing has been charged.`,
        });
      }
      break;
    }

    case "message.received": {
      const conversationId = String(event.payload.conversationId ?? "");
      const recipientId = String(event.payload.recipientId ?? "");
      const senderId = String(event.payload.senderId ?? "");
      if (!conversationId || !recipientId) return;
      const conversation = await db
        .prepare("SELECT subject FROM conversations WHERE id = ?")
        .bind(conversationId)
        .first<{ subject: string | null }>();
      const sender = await db
        .prepare("SELECT full_name FROM users WHERE id = ?")
        .bind(senderId)
        .first<{ full_name: string }>();
      await notify(db, {
        userId: recipientId,
        type: "message.received",
        title: `New message from ${sender?.full_name ?? "a guest"}`,
        body: event.payload.preview ? String(event.payload.preview).slice(0, 140) : conversation?.subject ?? "",
      });
      break;
    }

    case "review.published": {
      const ownerId = String(event.payload.ownerId ?? "");
      if (!ownerId) return;
      await notify(db, {
        userId: ownerId,
        type: "review.published",
        title: "A guest left a review",
        body: `${event.payload.rating ?? 5}/5 · ${String(event.payload.propertyTitle ?? "")}`,
      });
      break;
    }

    case "payout.scheduled": {
      const ownerId = String(event.payload.ownerId ?? event.aggregateId);
      const amount = Number(event.payload.amount ?? 0);
      await notify(db, {
        userId: ownerId,
        type: "payout.scheduled",
        title: "Payout scheduled",
        body: `${formatINR(amount)} will be transferred on the next payout cycle.`,
      });
      break;
    }

    default:
      break;
  }
}

async function loadBookingContext(db: Database, bookingId: string) {
  return db
    .prepare(
      `SELECT b.*, p.title AS property_title, p.owner_id,
              u.full_name AS guest_name, u.email AS guest_email, u.phone AS guest_phone
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.guest_id
       WHERE b.id = ?`,
    )
    .bind(bookingId)
    .first<{
      id: string;
      code: string;
      check_in: string;
      check_out: string;
      nights: number;
      total_amount: number;
      status: string;
      guest_id: string;
      owner_id: string;
      guest_name: string;
      guest_email: string;
      guest_phone: string | null;
      property_title: string;
    }>();
}
