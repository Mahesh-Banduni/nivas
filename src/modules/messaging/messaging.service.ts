import { getDb } from "@/db";
import type { Database } from "@/db/database";
import type { MessageRow } from "@/db/types";
import { nowIso } from "@/lib/date";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { outboxStatement } from "@/modules/notifications/outbox";

export interface ConversationSummary {
  id: string;
  booking_id: string | null;
  property_id: string | null;
  subject: string | null;
  property_title: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  other_name: string;
  other_color: string;
  other_id: string;
  unread: number;
}

export async function listConversations(db: Database, userId: string) {
  return db
    .prepare(
      `SELECT c.id, c.booking_id, c.property_id, c.subject, c.last_message_at, c.last_message_preview,
              p.title AS property_title,
              (SELECT u.full_name FROM conversation_members cm2 JOIN users u ON u.id = cm2.user_id
                WHERE cm2.conversation_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_name,
              (SELECT u.avatar_color FROM conversation_members cm2 JOIN users u ON u.id = cm2.user_id
                WHERE cm2.conversation_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_color,
              (SELECT cm2.user_id FROM conversation_members cm2
                WHERE cm2.conversation_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_id,
              (SELECT COUNT(*) FROM messages m
                WHERE m.conversation_id = c.id
                  AND m.sender_id != ?
                  AND m.created_at > COALESCE(cm.last_read_at, '')) AS unread
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
       LEFT JOIN properties p ON p.id = c.property_id
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
    )
    .bind(userId, userId, userId, userId, userId)
    .all<ConversationSummary>();
}

export async function assertMembership(db: Database, conversationId: string, userId: string) {
  const member = await db
    .prepare("SELECT 1 AS ok FROM conversation_members WHERE conversation_id = ? AND user_id = ?")
    .bind(conversationId, userId)
    .first<{ ok: number }>();
  if (!member) throw forbidden("You are not part of this conversation");
}

export async function getThread(db: Database, userId: string, conversationId: string) {
  await assertMembership(db, conversationId, userId);
  const conversation = await db
    .prepare(
      `SELECT c.*, p.title AS property_title
       FROM conversations c LEFT JOIN properties p ON p.id = c.property_id
       WHERE c.id = ?`,
    )
    .bind(conversationId)
    .first<{
      id: string;
      booking_id: string | null;
      property_id: string | null;
      subject: string | null;
      created_at: string;
      property_title: string | null;
    }>();
  if (!conversation) throw notFound("Conversation not found");

  const [messages, members] = await Promise.all([
    db
      .prepare(
        `SELECT m.*, u.full_name AS sender_name, u.avatar_color
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ? ORDER BY m.created_at ASC LIMIT 500`,
      )
      .bind(conversationId)
      .all<MessageRow & { sender_name: string; avatar_color: string }>(),
    db
      .prepare(
        `SELECT u.id, u.full_name, u.avatar_color, cm.last_read_at
         FROM conversation_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.conversation_id = ?`,
      )
      .bind(conversationId)
      .all<{ id: string; full_name: string; avatar_color: string; last_read_at: string | null }>(),
  ]);

  return { conversation, messages, members };
}

export async function sendMessage(
  db: Database,
  userId: string,
  conversationId: string,
  rawBody: string,
) {
  const body = rawBody.trim();
  if (!body) throw badRequest("Message cannot be empty");
  if (body.length > 2000) throw badRequest("Messages are limited to 2000 characters");
  await assertMembership(db, conversationId, userId);

  const now = nowIso();
  const messageId = newId("msg");
  const recipient = await db
    .prepare("SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ? LIMIT 1")
    .bind(conversationId, userId)
    .first<{ user_id: string }>();

  await db.batch([
    db
      .prepare("INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(messageId, conversationId, userId, body, now),
    db
      .prepare("UPDATE conversations SET last_message_at = ?, last_message_preview = ? WHERE id = ?")
      .bind(now, body.slice(0, 160), conversationId),
    db
      .prepare("UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?")
      .bind(now, conversationId, userId),
    ...(recipient
      ? [
          outboxStatement(db, {
            type: "message.received",
            aggregateType: "conversation",
            aggregateId: conversationId,
            payload: {
              conversationId,
              recipientId: recipient.user_id,
              senderId: userId,
              preview: body.slice(0, 140),
            },
          }),
        ]
      : []),
  ]);

  return { id: messageId, created_at: now, body };
}

export async function markConversationRead(db: Database, userId: string, conversationId: string) {
  await db
    .prepare("UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?")
    .bind(nowIso(), conversationId, userId)
    .run();
}

export async function unreadMessageCount(db: Database, userId: string) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM messages m
       JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ?
       WHERE m.sender_id != ? AND m.created_at > COALESCE(cm.last_read_at, '')`,
    )
    .bind(userId, userId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/** Called when a booking is confirmed, so guest and host have a thread ready. */
export async function ensureBookingConversation(
  db: Database,
  booking: { id: string; property_id: string; property_title: string; owner_id: string; guest_id: string; code: string },
) {
  const existing = await db
    .prepare("SELECT id FROM conversations WHERE booking_id = ? LIMIT 1")
    .bind(booking.id)
    .first<{ id: string }>();
  const conversationId = existing?.id ?? newId("cnv");
  if (existing) return conversationId;

  await db.batch([
    db
      .prepare(
        "INSERT INTO conversations (id, booking_id, property_id, subject, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        conversationId,
        booking.id,
        booking.property_id,
        `${booking.property_title} · booking ${booking.code}`,
        nowIso(),
      ),
    db
      .prepare("INSERT INTO conversation_members (conversation_id, user_id, last_read_at) VALUES (?, ?, ?)")
      .bind(conversationId, booking.guest_id, nowIso()),
    db
      .prepare("INSERT INTO conversation_members (conversation_id, user_id, last_read_at) VALUES (?, ?, ?)")
      .bind(conversationId, booking.owner_id, nowIso()),
  ]);
  return conversationId;
}

/** Guest-initiated enquiry about a property they have not booked. */
export async function startEnquiry(userId: string, propertyId: string, body: string) {
  const db = await getDb();
  const property = await db
    .prepare(
      `SELECT p.id, p.title, p.owner_id, u.full_name AS owner_name
       FROM properties p JOIN users u ON u.id = p.owner_id WHERE p.id = ?`,
    )
    .bind(propertyId)
    .first<{ id: string; title: string; owner_id: string; owner_name: string }>();
  if (!property) throw notFound("Property not found");
  if (property.owner_id === userId) throw badRequest("This is your own listing");

  const existing = await db
    .prepare(
      `SELECT c.id FROM conversations c
       JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?
       JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ?
       WHERE c.property_id = ? AND c.booking_id IS NULL LIMIT 1`,
    )
    .bind(userId, property.owner_id, propertyId)
    .first<{ id: string }>();

  let conversationId = existing?.id;
  if (!conversationId) {
    conversationId = newId("cnv");
    await db.batch([
      db
        .prepare(
          "INSERT INTO conversations (id, booking_id, property_id, subject, created_at) VALUES (?, NULL, ?, ?, ?)",
        )
        .bind(conversationId, propertyId, `Enquiry · ${property.title}`, nowIso()),
      db
        .prepare("INSERT INTO conversation_members (conversation_id, user_id, last_read_at) VALUES (?, ?, ?)")
        .bind(conversationId, userId, nowIso()),
      db
        .prepare("INSERT INTO conversation_members (conversation_id, user_id, last_read_at) VALUES (?, ?, ?)")
        .bind(conversationId, property.owner_id, nowIso()),
    ]);
  }

  await sendMessage(db, userId, conversationId, body);
  return conversationId;
}
