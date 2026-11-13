import { getDb } from "@/db";
import type { Database } from "@/db/database";
import type { PropertyRow } from "@/db/types";
import { cached, invalidate } from "@/infrastructure/cloudflare/kv";
import { newId, slugify } from "@/lib/ids";
import { nowIso } from "@/lib/date";
import { notFound } from "@/lib/errors";
import { auditStatement } from "@/modules/admin/audit";
import { outboxStatement } from "@/modules/notifications/outbox";
import {
  findCard,
  findPropertyBySlugOrId,
  getDestinations,
  getFeaturedProperties,
  getPropertyDetail,
  getSimilarProperties,
  incrementViewCount,
  listOwnerProperties,
  searchProperties,
  type SearchFilters,
} from "./property.repository";
import type { PropertyInput } from "./property.schema";

const CACHE_TTL = 90;

export async function searchMarketplace(filters: SearchFilters) {
  const key = `search:v1:${JSON.stringify(filters)}`;
  return cached(key, CACHE_TTL, async () => {
    const db = await getDb();
    const result = await searchProperties(db, filters);
    return result;
  });
}

export async function getFeatured() {
  return cached("home:featured:v1", 60, async () => {
    const db = await getDb();
    return getFeaturedProperties(db, 6);
  });
}

export async function getDestinationsCached() {
  return cached("home:destinations:v1", 300, async () => {
    const db = await getDb();
    return getDestinations(db);
  });
}

export async function getMarketplaceStats() {
  return cached("home:stats:v1", 120, async () => {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM properties WHERE status = 'published') AS properties,
           (SELECT COUNT(DISTINCT city) FROM properties WHERE status = 'published') AS cities,
           (SELECT COUNT(*) FROM users) AS guests,
           (SELECT COUNT(*) FROM bookings WHERE status IN ('booked','completed')) AS stays`,
      )
      .first<{ properties: number; cities: number; guests: number; stays: number }>();
    return row ?? { properties: 0, cities: 0, guests: 0, stays: 0 };
  });
}

export async function getPropertyPage(idOrSlug: string) {
  const db = await getDb();
  const detail = await getPropertyDetail(db, idOrSlug);
  if (!detail) return null;

  const [similar, reviews, ownerStats] = await Promise.all([
    getSimilarProperties(db, detail, 3),
    db
      .prepare(
        `SELECT r.*, u.full_name AS guest_name, u.avatar_color
         FROM reviews r JOIN users u ON u.id = r.guest_id
         WHERE r.property_id = ? AND r.status = 'published'
         ORDER BY r.created_at DESC LIMIT 8`,
      )
      .bind(detail.id)
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
      }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS listings, COALESCE(AVG(rating_avg), 0) AS rating
         FROM properties WHERE owner_id = ? AND status = 'published'`,
      )
      .bind(detail.owner_id)
      .first<{ listings: number; rating: number }>(),
  ]);

  return {
    property: detail,
    similar,
    reviews,
    ownerStats: ownerStats ?? { listings: 0, rating: 0 },
  };
}

export async function getPropertyCard(idOrSlug: string) {
  const db = await getDb();
  return findCard(db, idOrSlug);
}

export async function recordPropertyView(id: string) {
  const db = await getDb();
  await incrementViewCount(db, id).catch(() => undefined);
}

async function uniqueSlug(db: Database, title: string) {
  const base = slugify(title) || "stay";
  let candidate = base;
  for (let i = 0; i < 30; i += 1) {
    const existing = await db
      .prepare("SELECT id FROM properties WHERE slug = ?")
      .bind(candidate)
      .first<{ id: string }>();
    if (!existing) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createListing(ownerId: string, input: PropertyInput): Promise<PropertyRow> {
  const db = await getDb();
  const id = newId("prp");
  const slug = await uniqueSlug(db, input.title);
  const now = nowIso();

  const property: PropertyRow = {
    id,
    owner_id: ownerId,
    slug,
    title: input.title,
    description: input.description,
    property_type: input.propertyType,
    city: input.city,
    state: input.state,
    country: "India",
    neighborhood: input.neighborhood ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    nightly_price: input.nightlyPrice * 100,
    cleaning_fee: input.cleaningFee * 100,
    currency: "INR",
    max_guests: input.maxGuests,
    bedrooms: input.bedrooms,
    beds: input.beds,
    bathrooms: input.bathrooms,
    rating_avg: 0,
    rating_count: 0,
    view_count: 0,
    featured: 0,
    status: "pending",
    rejection_note: null,
    created_at: now,
    updated_at: now,
  };

  const statements = [
    db
      .prepare(
        `INSERT INTO properties
          (id, owner_id, slug, title, description, property_type, city, state, country, neighborhood,
           latitude, longitude, nightly_price, cleaning_fee, currency, max_guests, bedrooms, beds, bathrooms,
           rating_avg, rating_count, view_count, featured, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'India', ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, 0, 0, 0, 0, 'pending', ?, ?)`,
      )
      .bind(
        property.id,
        property.owner_id,
        property.slug,
        property.title,
        property.description,
        property.property_type,
        property.city,
        property.state,
        property.neighborhood,
        property.latitude,
        property.longitude,
        property.nightly_price,
        property.cleaning_fee,
        property.max_guests,
        property.bedrooms,
        property.beds,
        property.bathrooms,
        now,
        now,
      ),
    db
      .prepare(
        `INSERT INTO property_rules
          (property_id, check_in_time, check_out_time, min_nights, max_nights, cancellation_policy, house_rules)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.checkInTime,
        input.checkOutTime,
        input.minNights,
        input.maxNights,
        input.cancellationPolicy,
        input.houseRules ?? null,
      ),
    ...input.amenities.map((amenityId) =>
      db
        .prepare("INSERT OR IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)")
        .bind(id, amenityId),
    ),
    auditStatement(db, {
      actorId: ownerId,
      action: "property.submitted",
      entityType: "property",
      entityId: id,
      metadata: input.title,
    }),
    outboxStatement(db, {
      type: "property.submitted",
      aggregateType: "property",
      aggregateId: id,
      payload: { propertyId: id, ownerId, title: input.title },
    }),
  ];

  await db.batch(statements);
  await invalidate("search:");
  await invalidate("home:");
  return property;
}

export async function updateListing(ownerId: string, propertyId: string, input: PropertyInput) {
  const db = await getDb();
  const existing = await findPropertyBySlugOrId(db, propertyId);
  if (!existing) throw notFound("Listing not found");
  if (existing.owner_id !== ownerId) throw notFound("Listing not found");

  const now = nowIso();
  await db.batch([
    db
      .prepare(
        `UPDATE properties SET
           title = ?, description = ?, property_type = ?, city = ?, state = ?, neighborhood = ?,
           latitude = ?, longitude = ?, nightly_price = ?, cleaning_fee = ?, max_guests = ?,
           bedrooms = ?, beds = ?, bathrooms = ?, updated_at = ?
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(
        input.title,
        input.description,
        input.propertyType,
        input.city,
        input.state,
        input.neighborhood ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.nightlyPrice * 100,
        input.cleaningFee * 100,
        input.maxGuests,
        input.bedrooms,
        input.beds,
        input.bathrooms,
        now,
        propertyId,
        ownerId,
      ),
    db
      .prepare(
        `UPDATE property_rules SET check_in_time = ?, check_out_time = ?, min_nights = ?,
           max_nights = ?, cancellation_policy = ?, house_rules = ? WHERE property_id = ?`,
      )
      .bind(
        input.checkInTime,
        input.checkOutTime,
        input.minNights,
        input.maxNights,
        input.cancellationPolicy,
        input.houseRules ?? null,
        propertyId,
      ),
    db.prepare("DELETE FROM property_amenities WHERE property_id = ?").bind(propertyId),
    ...input.amenities.map((amenityId) =>
      db
        .prepare("INSERT OR IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)")
        .bind(propertyId, amenityId),
    ),
    auditStatement(db, {
      actorId: ownerId,
      action: "property.updated",
      entityType: "property",
      entityId: propertyId,
      metadata: input.title,
    }),
  ]);

  await invalidate("search:");
  await invalidate("home:");
}

export async function submitForReview(ownerId: string, propertyId: string) {
  const db = await getDb();
  const result = await db
    .prepare(
      "UPDATE properties SET status = 'pending', rejection_note = NULL, updated_at = ? WHERE id = ? AND owner_id = ? AND status IN ('draft','rejected')",
    )
    .bind(nowIso(), propertyId, ownerId)
    .run();
  if (!result.changes) throw notFound("Listing not available to submit");
  await invalidate("search:");
}

export async function getOwnerListings(ownerId: string) {
  const db = await getDb();
  return listOwnerProperties(db, ownerId);
}

export async function getAmenityCatalogue() {
  return cached("amenities:v1", 3600, async () => {
    const db = await getDb();
    return db.prepare("SELECT * FROM amenities ORDER BY name ASC").all<{
      id: string;
      name: string;
      icon: string;
    }>();
  });
}
