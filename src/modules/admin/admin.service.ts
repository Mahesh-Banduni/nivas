import { getDb } from "@/db";
import type { Database } from "@/db/database";
import type { BookingWithProperty } from "@/db/types";
import { nowIso, todayISO } from "@/lib/date";
import { fillSeries, monthKeysBack } from "@/lib/analytics";
import { notFound } from "@/lib/errors";
import { notify } from "@/modules/notifications/notification.service";
import { outboxStatement, outboxStats } from "@/modules/notifications/outbox";
import { audit, auditStatement } from "./audit";

export async function getAdminOverview() {
  const db = await getDb();
  const months = monthKeysBack(6);
  const windowStart = months[0] + "-01";
  const today = todayISO();

  const [totals, monthlyRows, moderationQueue, recentBookings, recentPayments, cities, types, users, stats] =
    await Promise.all([
      db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
             (SELECT COUNT(*) FROM users) AS total_users,
             (SELECT COUNT(*) FROM properties WHERE status = 'published') AS live_properties,
             (SELECT COUNT(*) FROM properties WHERE status = 'pending') AS pending_properties,
             (SELECT COUNT(*) FROM bookings) AS bookings,
             (SELECT COUNT(*) FROM bookings WHERE status = 'booked') AS upcoming_bookings,
             (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'paid') AS gmv,
             (SELECT COALESCE(SUM(platform_fee),0) FROM commissions c
                JOIN bookings b ON b.id = c.booking_id
                WHERE b.status IN ('booked','completed')) AS platform_revenue,
             (SELECT COALESCE(SUM(owner_amount),0) FROM commissions c
                JOIN bookings b ON b.id = c.booking_id
                WHERE b.status IN ('booked','completed')) AS owner_earnings,
             (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') AS cancellations`,
        )
        .first<{
          active_users: number;
          total_users: number;
          live_properties: number;
          pending_properties: number;
          bookings: number;
          upcoming_bookings: number;
          gmv: number;
          platform_revenue: number;
          owner_earnings: number;
          cancellations: number;
        }>(),
      db
        .prepare(
          `SELECT substr(created_at, 1, 7) AS month, SUM(amount) AS value
           FROM payments WHERE status = 'paid' AND created_at >= ?
           GROUP BY month ORDER BY month`,
        )
        .bind(windowStart)
        .all<{ month: string; value: number }>(),
      db
        .prepare(
          `SELECT p.*, u.full_name AS owner_name, o.verification_status
           FROM properties p
           JOIN users u ON u.id = p.owner_id
           LEFT JOIN owner_profiles o ON o.user_id = p.owner_id
           WHERE p.status IN ('pending','rejected','suspended')
           ORDER BY p.updated_at DESC LIMIT 10`,
        )
        .all<{
          id: string;
          title: string;
          city: string;
          property_type: string;
          nightly_price: number;
          status: string;
          owner_name: string;
          verification_status: string | null;
          updated_at: string;
        }>(),
      db
        .prepare(
          `SELECT b.id, b.code, b.check_in, b.check_out, b.status, b.total_amount, b.created_at,
                  p.title AS property_title, u.full_name AS guest_name
           FROM bookings b
           JOIN properties p ON p.id = b.property_id
           JOIN users u ON u.id = b.guest_id
           ORDER BY b.created_at DESC LIMIT 8`,
        )
        .all<{
          id: string;
          code: string;
          check_in: string;
          check_out: string;
          status: string;
          total_amount: number;
          created_at: string;
          property_title: string;
          guest_name: string;
        }>(),
      db
        .prepare(
          `SELECT pay.id, pay.amount, pay.status, pay.method, pay.created_at, b.code AS booking_code,
                  u.full_name AS guest_name
           FROM payments pay
           JOIN bookings b ON b.id = pay.booking_id
           JOIN users u ON u.id = b.guest_id
           ORDER BY pay.created_at DESC LIMIT 8`,
        )
        .all<{
          id: string;
          amount: number;
          status: string;
          method: string | null;
          created_at: string;
          booking_code: string;
          guest_name: string;
        }>(),
      db
        .prepare(
          `SELECT p.city, COUNT(DISTINCT b.id) AS bookings, COALESCE(SUM(pay.amount), 0) AS gmv
           FROM properties p
           JOIN bookings b ON b.property_id = p.id AND b.status IN ('booked','completed')
           JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'paid'
           GROUP BY p.city ORDER BY gmv DESC LIMIT 6`,
        )
        .all<{ city: string; bookings: number; gmv: number }>(),
      db
        .prepare(
          `SELECT p.property_type AS type, COUNT(DISTINCT b.id) AS bookings, COALESCE(SUM(pay.amount), 0) AS gmv
           FROM properties p
           JOIN bookings b ON b.property_id = p.id AND b.status IN ('booked','completed')
           JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'paid'
           GROUP BY p.property_type ORDER BY gmv DESC`,
        )
        .all<{ type: string; bookings: number; gmv: number }>(),
      db
        .prepare(
          `SELECT u.id, u.full_name, u.email, u.status, u.created_at, u.avatar_color,
                  group_concat(r.role) AS roles,
                  o.verification_status,
                  (SELECT COUNT(*) FROM properties WHERE owner_id = u.id) AS property_count
           FROM users u
           LEFT JOIN user_roles r ON r.user_id = u.id
           LEFT JOIN owner_profiles o ON o.user_id = u.id
           GROUP BY u.id
           ORDER BY u.created_at DESC LIMIT 12`,
        )
        .all<{
          id: string;
          full_name: string;
          email: string;
          status: string;
          created_at: string;
          avatar_color: string;
          roles: string | null;
          verification_status: string | null;
          property_count: number;
        }>(),
      outboxStats(db),
    ]);

  return {
    totals: totals ?? {
      active_users: 0,
      total_users: 0,
      live_properties: 0,
      pending_properties: 0,
      bookings: 0,
      upcoming_bookings: 0,
      gmv: 0,
      platform_revenue: 0,
      owner_earnings: 0,
      cancellations: 0,
    },
    revenueSeries: fillSeries(monthlyRows, months),
    moderationQueue,
    recentBookings,
    recentPayments,
    cities,
    types,
    users,
    outbox: stats,
    today,
  };
}

export async function listModerationQueue(db: Database) {
  return db
    .prepare(
      `SELECT p.*, u.full_name AS owner_name, o.business_name, o.verification_status,
              (SELECT COUNT(*) FROM property_images i WHERE i.property_id = p.id) AS image_count
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN owner_profiles o ON o.user_id = p.owner_id
       WHERE p.status IN ('pending','rejected','suspended','published')
       ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END,
                p.updated_at DESC
       LIMIT 60`,
    )
    .all<{
      id: string;
      title: string;
      city: string;
      state: string;
      property_type: string;
      nightly_price: number;
      status: string;
      owner_name: string;
      business_name: string | null;
      verification_status: string | null;
      image_count: number;
      updated_at: string;
      rejection_note: string | null;
      featured: number;
    }>();
}

export async function moderateProperty(input: {
  adminId: string;
  propertyId: string;
  decision: "approve" | "reject" | "suspend" | "restore";
  note?: string;
}) {
  const db = await getDb();
  const property = await db
    .prepare("SELECT * FROM properties WHERE id = ?")
    .bind(input.propertyId)
    .first<{ id: string; owner_id: string; title: string; status: string }>();
  if (!property) throw notFound("Property not found");

  const status =
    input.decision === "approve" || input.decision === "restore"
      ? "published"
      : input.decision === "reject"
        ? "rejected"
        : "suspended";

  await db.batch([
    db
      .prepare("UPDATE properties SET status = ?, rejection_note = ?, updated_at = ? WHERE id = ?")
      .bind(status, input.note ?? null, nowIso(), property.id),
    auditStatement(db, {
      actorId: input.adminId,
      action: `property.${input.decision}`,
      entityType: "property",
      entityId: property.id,
      metadata: input.note ?? property.title,
    }),
    outboxStatement(db, {
      type: `property.${input.decision}`,
      aggregateType: "property",
      aggregateId: property.id,
      payload: {
        propertyId: property.id,
        ownerId: property.owner_id,
        title: property.title,
        note: input.note ?? "",
      },
    }),
  ]);

  await notify(db, {
    userId: property.owner_id,
    type: `property.${input.decision}`,
    title:
      status === "published"
        ? `${property.title} is live`
        : `${property.title} needs attention`,
    body:
      status === "published"
        ? "Your listing is now visible in search and can accept reservations."
        : input.note ?? "An administrator reviewed your listing. Open your dashboard for details.",
  });

  return { status };
}

export async function setPropertyFeatured(adminId: string, propertyId: string, featured: boolean) {
  const db = await getDb();
  await db.batch([
    db.prepare("UPDATE properties SET featured = ?, updated_at = ? WHERE id = ?").bind(featured ? 1 : 0, nowIso(), propertyId),
    auditStatement(db, {
      actorId: adminId,
      action: featured ? "property.featured" : "property.unfeatured",
      entityType: "property",
      entityId: propertyId,
      metadata: null,
    }),
  ]);
}

export async function setUserStatus(adminId: string, userId: string, status: "active" | "suspended") {
  const db = await getDb();
  const user = await db
    .prepare("SELECT id, full_name, status FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; full_name: string; status: string }>();
  if (!user) throw notFound("User not found");

  await db.batch([
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").bind(status, nowIso(), userId),
    ...(status === "suspended"
      ? [db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId)]
      : []),
    auditStatement(db, {
      actorId: adminId,
      action: status === "suspended" ? "user.suspended" : "user.reactivated",
      entityType: "user",
      entityId: userId,
      metadata: user.full_name,
    }),
  ]);
}

export async function verifyOwner(adminId: string, userId: string) {
  const db = await getDb();
  await db.batch([
    db
      .prepare("UPDATE owner_profiles SET verification_status = 'verified' WHERE user_id = ?")
      .bind(userId),
    auditStatement(db, {
      actorId: adminId,
      action: "owner.verified",
      entityType: "user",
      entityId: userId,
      metadata: null,
    }),
  ]);
}

export async function listAllBookings(db: Database, limit = 100) {
  return db
    .prepare(
      `SELECT b.*, p.title AS property_title, u.full_name AS guest_name, o.full_name AS owner_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.guest_id
       JOIN users o ON o.id = p.owner_id
       ORDER BY b.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<BookingWithProperty & { owner_name: string }>();
}

export async function listAllReviews(db: Database, limit = 40) {
  return db
    .prepare(
      `SELECT r.*, p.title AS property_title, u.full_name AS guest_name
       FROM reviews r
       JOIN properties p ON p.id = r.property_id
       JOIN users u ON u.id = r.guest_id
       ORDER BY r.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      rating: number;
      comment: string | null;
      status: string;
      created_at: string;
      property_title: string;
      guest_name: string;
    }>();
}

export async function listUsers(db: Database, limit = 100) {
  return db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.avatar_color, u.created_at,
              group_concat(r.role) AS roles,
              o.business_name, o.verification_status, o.payout_last4,
              (SELECT COUNT(*) FROM properties WHERE owner_id = u.id) AS property_count,
              (SELECT COUNT(*) FROM bookings WHERE guest_id = u.id) AS booking_count
       FROM users u
       LEFT JOIN user_roles r ON r.user_id = u.id
       LEFT JOIN owner_profiles o ON o.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      status: string;
      avatar_color: string;
      created_at: string;
      roles: string | null;
      business_name: string | null;
      verification_status: string | null;
      payout_last4: string | null;
      property_count: number;
      booking_count: number;
    }>();
}

export async function listAllPayments(db: Database, limit = 100) {
  return db
    .prepare(
      `SELECT pay.*, b.code AS booking_code, b.status AS booking_status, b.check_in, b.check_out,
              u.full_name AS guest_name, p.title AS property_title
       FROM payments pay
       JOIN bookings b ON b.id = pay.booking_id
       JOIN users u ON u.id = b.guest_id
       JOIN properties p ON p.id = b.property_id
       ORDER BY pay.created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      booking_id: string;
      provider: string;
      provider_order_id: string | null;
      provider_payment_id: string | null;
      amount: number;
      currency: string;
      status: string;
      method: string | null;
      failure_reason: string | null;
      created_at: string;
      updated_at: string;
      booking_code: string;
      booking_status: string;
      check_in: string;
      check_out: string;
      guest_name: string;
      property_title: string;
    }>();
}

export async function listAllRefunds(db: Database, limit = 50) {
  return db
    .prepare(
      `SELECT r.*, b.code AS booking_code, u.full_name AS guest_name,
              pay.provider, pay.provider_payment_id, pay.status AS payment_status
       FROM refunds r
       JOIN bookings b ON b.id = r.booking_id
       JOIN users u ON u.id = b.guest_id
       JOIN payments pay ON pay.id = r.payment_id
       ORDER BY r.created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      payment_id: string;
      booking_id: string;
      amount: number;
      reason: string;
      status: string;
      provider_refund_id: string | null;
      created_at: string;
      updated_at: string;
      booking_code: string;
      guest_name: string;
      provider: string;
      provider_payment_id: string | null;
      payment_status: string;
    }>();
}

export async function listOutboxEvents(db: Database, limit = 40) {  return db
    .prepare(
      `SELECT id, type, aggregate_type, aggregate_id, status, attempts, last_error, available_at, created_at, published_at
       FROM outbox_events ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      type: string;
      aggregate_type: string;
      aggregate_id: string;
      status: string;
      attempts: number;
      last_error: string | null;
      available_at: string;
      created_at: string;
      published_at: string | null;
    }>();
}

export async function logAdminAction(actorId: string, action: string, entityType: string, entityId: string) {
  const db = await getDb();
  await audit(db, { actorId, action, entityType, entityId });
}
