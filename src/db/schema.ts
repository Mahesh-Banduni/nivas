/**
 * Drizzle schema — the typed mirror of migrations/0001_init.sql.
 *
 * The migration file is the single source of truth for DDL (applied by
 * `wrangler d1 migrations apply` in production). These definitions give the
 * application inferred types and power `drizzle-kit generate` for future
 * changes. Runtime queries go through the repository layer so they stay
 * portable between node:sqlite and D1.
 */
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarColor: text("avatar_color").notNull().default("#234A3D"),
  status: text("status", { enum: ["active", "suspended", "deleted"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["guest", "owner", "admin"] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_sessions_user").on(table.userId)],
);

export const ownerProfiles = sqliteTable("owner_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  bio: text("bio"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] })
    .notNull()
    .default("pending"),
  payoutLast4: text("payout_last4"),
  createdAt: text("created_at").notNull(),
});

export const guestProfiles = sqliteTable("guest_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone"),
  profileImage: text("profile_image"),
  createdAt: text("created_at").notNull(),
});

export const properties = sqliteTable(
  "properties",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    propertyType: text("property_type").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull().default("India"),
    neighborhood: text("neighborhood"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    nightlyPrice: integer("nightly_price").notNull(),
    cleaningFee: integer("cleaning_fee").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    maxGuests: integer("max_guests").notNull().default(2),
    bedrooms: integer("bedrooms").notNull().default(1),
    beds: integer("beds").notNull().default(1),
    bathrooms: integer("bathrooms").notNull().default(1),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    featured: integer("featured").notNull().default(0),
    status: text("status", { enum: ["draft", "pending", "published", "rejected", "suspended"] })
      .notNull()
      .default("draft"),
    rejectionNote: text("rejection_note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_properties_owner").on(table.ownerId),
    index("idx_properties_search").on(table.status, table.city, table.propertyType),
  ],
);

export const propertyImages = sqliteTable(
  "property_images",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    url: text("url"),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_property_images_property").on(table.propertyId, table.position)],
);

export const amenities = sqliteTable("amenities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

export const propertyAmenities = sqliteTable(
  "property_amenities",
  {
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    amenityId: text("amenity_id").notNull().references(() => amenities.id),
  },
  (table) => [primaryKey({ columns: [table.propertyId, table.amenityId] })],
);

export const propertyRules = sqliteTable("property_rules", {
  propertyId: text("property_id").primaryKey().references(() => properties.id, { onDelete: "cascade" }),
  checkInTime: text("check_in_time").notNull().default("14:00"),
  checkOutTime: text("check_out_time").notNull().default("11:00"),
  minNights: integer("min_nights").notNull().default(1),
  maxNights: integer("max_nights").notNull().default(30),
  cancellationPolicy: text("cancellation_policy", { enum: ["flexible", "moderate", "strict"] })
    .notNull()
    .default("moderate"),
  houseRules: text("house_rules"),
});

export const availabilityBlocks = sqliteTable("availability_blocks", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull().default("owner_block"),
  createdAt: text("created_at").notNull(),
});

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    guestId: text("guest_id").notNull().references(() => users.id),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    nights: integer("nights").notNull(),
    guests: integer("guests").notNull().default(1),
    nightlyPrice: integer("nightly_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    cleaningFee: integer("cleaning_fee").notNull().default(0),
    serviceFee: integer("service_fee").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    totalAmount: integer("total_amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status", {
      enum: ["held", "booked", "completed", "cancelled", "expired", "refunded"],
    })
      .notNull()
      .default("held"),
    paymentStatus: text("payment_status", {
      enum: ["unpaid", "pending", "paid", "refunded", "partially_refunded"],
    })
      .notNull()
      .default("unpaid"),
    holdExpiresAt: text("hold_expires_at"),
    cancelledAt: text("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_bookings_property_dates").on(table.propertyId, table.checkIn, table.checkOut),
    index("idx_bookings_guest").on(table.guestId, table.createdAt),
  ],
);

export const bookingNights = sqliteTable(
  "booking_nights",
  {
    propertyId: text("property_id").notNull().references(() => properties.id),
    stayDate: text("stay_date").notNull(),
    bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.propertyId, table.stayDate] })],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id").notNull().references(() => bookings.id),
    provider: text("provider").notNull().default("razorpay"),
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status", { enum: ["created", "pending", "paid", "failed", "expired", "refunded"] })
      .notNull()
      .default("created"),
    method: text("method"),
    failureReason: text("failure_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_payment_provider_order")
      .on(table.provider, table.providerOrderId)
      .where(sql`provider_order_id IS NOT NULL`),
    index("idx_payments_booking").on(table.bookingId),
  ],
);

export const refunds = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => payments.id),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] })
    .notNull()
    .default("pending"),
  providerRefundId: text("provider_refund_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const paymentEvents = sqliteTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: text("payload"),
    processedAt: text("processed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("payment_events_provider_event").on(table.provider, table.providerEventId)],
);

export const commissions = sqliteTable("commissions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().unique().references(() => bookings.id),
  platformFee: integer("platform_fee").notNull(),
  ownerAmount: integer("owner_amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  createdAt: text("created_at").notNull(),
});

export const payouts = sqliteTable("payouts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  status: text("status", { enum: ["pending", "scheduled", "paid", "failed"] }).notNull().default("pending"),
  reference: text("reference"),
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  propertyId: text("property_id").references(() => properties.id, { onDelete: "set null" }),
  subject: text("subject"),
  lastMessageAt: text("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  createdAt: text("created_at").notNull(),
});

export const conversationMembers = sqliteTable(
  "conversation_members",
  {
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: text("last_read_at"),
  },
  (table) => [primaryKey({ columns: [table.conversationId, table.userId] })],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_messages_conversation").on(table.conversationId, table.createdAt)],
);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  channel: text("channel").notNull().default("in_app"),
  status: text("status", { enum: ["queued", "sent", "failed", "read"] }).notNull().default("queued"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

export const outboxEvents = sqliteTable("outbox_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payload: text("payload").notNull(),
  status: text("status", { enum: ["pending", "published", "failed"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: text("available_at").notNull(),
  publishedAt: text("published_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").notNull().unique().references(() => bookings.id),
  guestId: text("guest_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  cleanliness: integer("cleanliness"),
  accuracy: integer("accuracy"),
  communication: integer("communication"),
  location: integer("location"),
  value: integer("value"),
  comment: text("comment"),
  status: text("status", { enum: ["published", "hidden"] }).notNull().default("published"),
  createdAt: text("created_at").notNull(),
});

export const wishlists = sqliteTable("wishlists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Saved stays"),
  createdAt: text("created_at").notNull(),
});

export const wishlistItems = sqliteTable(
  "wishlist_items",
  {
    wishlistId: text("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.wishlistId, table.propertyId] })],
);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull(),
});
