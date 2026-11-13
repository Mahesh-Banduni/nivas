import type { Database } from "@/db/database";
import type {
  AmenityRow,
  PropertyCardData,
  PropertyDetail,
  PropertyImageRow,
  PropertyRow,
  PropertyRulesRow,
} from "@/db/types";
import { nowIso } from "@/lib/date";

const CARD_COLUMNS = `
  p.*,
  u.full_name AS owner_name,
  (SELECT i.r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_key,
  (SELECT i.url   FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_url,
  (SELECT group_concat(a.name, '|')
     FROM property_amenities pa JOIN amenities a ON a.id = pa.amenity_id
     WHERE pa.property_id = p.id) AS amenity_names
`;

export interface SearchFilters {
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  amenities?: string[];
  checkIn?: string;
  checkOut?: string;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  perPage?: number;
  featuredOnly?: boolean;
}

type Where = { sql: string; params: unknown[] };

function buildWhere(filters: SearchFilters): Where {
  const clauses: string[] = ["p.status = 'published'"];
  const params: unknown[] = [];

  if (filters.city) {
    clauses.push("(p.city LIKE ? OR p.neighborhood LIKE ? OR p.state LIKE ?)");
    const like = `%${filters.city.trim()}%`;
    params.push(like, like, like);
  }
  if (filters.type) {
    clauses.push("p.property_type = ?");
    params.push(filters.type);
  }
  if (typeof filters.minPrice === "number") {
    clauses.push("p.nightly_price >= ?");
    params.push(filters.minPrice);
  }
  if (typeof filters.maxPrice === "number") {
    clauses.push("p.nightly_price <= ?");
    params.push(filters.maxPrice);
  }
  if (filters.guests && filters.guests > 1) {
    clauses.push("p.max_guests >= ?");
    params.push(filters.guests);
  }
  if (filters.featuredOnly) {
    clauses.push("p.featured = 1");
  }
  if (filters.amenities?.length) {
    clauses.push(
      `(SELECT COUNT(DISTINCT pa.amenity_id) FROM property_amenities pa
        WHERE pa.property_id = p.id AND pa.amenity_id IN (${filters.amenities
          .map(() => "?")
          .join(",")})) = ?`,
    );
    params.push(...filters.amenities, filters.amenities.length);
  }
  if (filters.checkIn && filters.checkOut && filters.checkIn < filters.checkOut) {
    clauses.push(
      `NOT EXISTS (
         SELECT 1 FROM booking_nights bn JOIN bookings b ON b.id = bn.booking_id
         WHERE bn.property_id = p.id
           AND bn.stay_date >= ? AND bn.stay_date < ?
           AND (b.status = 'booked' OR b.status = 'completed'
                OR (b.status = 'held' AND b.hold_expires_at > ?))
       )`,
    );
    params.push(filters.checkIn, filters.checkOut, nowIso());
    clauses.push(
      `NOT EXISTS (
         SELECT 1 FROM availability_blocks ab
         WHERE ab.property_id = p.id AND ab.end_date > ? AND ab.start_date < ?
       )`,
    );
    params.push(filters.checkIn, filters.checkOut);
  }

  return { sql: clauses.join(" AND "), params };
}

function orderBy(sort: SearchFilters["sort"]): string {
  switch (sort) {
    case "price_asc":
      return "p.nightly_price ASC, p.rating_avg DESC";
    case "price_desc":
      return "p.nightly_price DESC, p.rating_avg DESC";
    case "rating":
      return "p.rating_avg DESC, p.rating_count DESC";
    case "newest":
      return "p.created_at DESC";
    default:
      return "p.featured DESC, p.rating_avg DESC, p.rating_count DESC";
  }
}

export async function searchProperties(
  db: Database,
  filters: SearchFilters,
): Promise<{ items: PropertyCardData[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(48, filters.perPage ?? 9);
  const where = buildWhere(filters);

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM properties p WHERE ${where.sql}`)
    .bind(...where.params)
    .first<{ total: number }>();

  const items = await db
    .prepare(
      `SELECT ${CARD_COLUMNS}
       FROM properties p JOIN users u ON u.id = p.owner_id
       WHERE ${where.sql}
       ORDER BY ${orderBy(filters.sort)}
       LIMIT ? OFFSET ?`,
    )
    .bind(...where.params, perPage, (page - 1) * perPage)
    .all<PropertyCardData>();

  return { items, total: countRow?.total ?? 0, page, perPage };
}

export async function findCard(db: Database, idOrSlug: string) {
  return db
    .prepare(
      `SELECT ${CARD_COLUMNS}
       FROM properties p JOIN users u ON u.id = p.owner_id
       WHERE (p.id = ? OR p.slug = ?) AND p.status = 'published'`,
    )
    .bind(idOrSlug, idOrSlug)
    .first<PropertyCardData>();
}

export async function findPropertyById(db: Database, id: string) {
  return db.prepare("SELECT * FROM properties WHERE id = ?").bind(id).first<PropertyRow>();
}

export async function findPropertyBySlugOrId(db: Database, idOrSlug: string) {
  return db
    .prepare("SELECT * FROM properties WHERE id = ? OR slug = ?")
    .bind(idOrSlug, idOrSlug)
    .first<PropertyRow>();
}

export async function getPropertyDetail(db: Database, idOrSlug: string): Promise<PropertyDetail | null> {
  const property = await db
    .prepare(
      `SELECT p.*,
              u.full_name AS owner_name,
              o.business_name AS owner_business,
              o.verification_status AS owner_verified,
              u.created_at AS owner_since
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN owner_profiles o ON o.user_id = p.owner_id
       WHERE (p.id = ? OR p.slug = ?)`,
    )
    .bind(idOrSlug, idOrSlug)
    .first<PropertyDetail>();
  if (!property) return null;

  const [images, amenities, rules] = await Promise.all([
    db
      .prepare("SELECT * FROM property_images WHERE property_id = ? ORDER BY position ASC")
      .bind(property.id)
      .all<PropertyImageRow>(),
    db
      .prepare(
        `SELECT a.* FROM amenities a
         JOIN property_amenities pa ON pa.amenity_id = a.id
         WHERE pa.property_id = ?
         ORDER BY a.name ASC`,
      )
      .bind(property.id)
      .all<AmenityRow>(),
    db.prepare("SELECT * FROM property_rules WHERE property_id = ?").bind(property.id).first<PropertyRulesRow>(),
  ]);

  return { ...property, images, amenities, rules };
}

export async function getFeaturedProperties(db: Database, limit = 6) {
  return db
    .prepare(
      `SELECT ${CARD_COLUMNS}
       FROM properties p JOIN users u ON u.id = p.owner_id
       WHERE p.status = 'published'
       ORDER BY p.featured DESC, p.rating_avg DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<PropertyCardData>();
}

export async function getSimilarProperties(db: Database, property: PropertyRow, limit = 3) {
  return db
    .prepare(
      `SELECT ${CARD_COLUMNS}
       FROM properties p JOIN users u ON u.id = p.owner_id
       WHERE p.status = 'published' AND p.id != ?
         AND (p.city = ? OR p.property_type = ?)
       ORDER BY (p.city = ?) DESC, p.rating_avg DESC
       LIMIT ?`,
    )
    .bind(property.id, property.city, property.property_type, property.city, limit)
    .all<PropertyCardData>();
}

export interface DestinationSummary {
  city: string;
  state: string;
  properties: number;
  min_price: number;
  cover_key: string | null;
  cover_url: string | null;
}

export async function getDestinations(db: Database): Promise<DestinationSummary[]> {
  return db
    .prepare(
      `SELECT p.city, p.state, COUNT(*) AS properties, MIN(p.nightly_price) AS min_price,
              (SELECT i.r2_key FROM property_images i
                JOIN properties p2 ON p2.id = i.property_id
                WHERE p2.city = p.city AND p2.status = 'published'
                ORDER BY p2.featured DESC, i.position ASC LIMIT 1) AS cover_key,
              (SELECT i.url FROM property_images i
                JOIN properties p2 ON p2.id = i.property_id
                WHERE p2.city = p.city AND p2.status = 'published'
                ORDER BY p2.featured DESC, i.position ASC LIMIT 1) AS cover_url
       FROM properties p
       WHERE p.status = 'published'
       GROUP BY p.city, p.state
       ORDER BY properties DESC, p.city ASC`,
    )
    .all<DestinationSummary>();
}

export async function listAmenities(db: Database) {
  return db.prepare("SELECT * FROM amenities ORDER BY name ASC").all<AmenityRow>();
}

export async function listAllAmenities(db: Database) {
  return db.prepare("SELECT * FROM amenities ORDER BY name ASC").all<AmenityRow>();
}

export async function listOwnerProperties(db: Database, ownerId: string) {
  return db
    .prepare(
      `SELECT ${CARD_COLUMNS},
        (SELECT COUNT(*) FROM bookings b WHERE b.property_id = p.id AND b.status IN ('booked','completed')) AS booking_count,
        (SELECT COALESCE(SUM(c.owner_amount), 0) FROM commissions c
           JOIN bookings b2 ON b2.id = c.booking_id
           WHERE b2.property_id = p.id AND b2.status IN ('booked','completed')) AS revenue
       FROM properties p JOIN users u ON u.id = p.owner_id
       WHERE p.owner_id = ?
       ORDER BY p.created_at DESC`,
    )
    .bind(ownerId)
    .all<PropertyCardData & { booking_count: number; revenue: number }>();
}

export async function incrementViewCount(db: Database, propertyId: string) {
  await db
    .prepare("UPDATE properties SET view_count = view_count + 1 WHERE id = ?")
    .bind(propertyId)
    .run();
}

export async function getPropertyImages(db: Database, propertyId: string) {
  return db
    .prepare("SELECT * FROM property_images WHERE property_id = ? ORDER BY position ASC")
    .bind(propertyId)
    .all<PropertyImageRow>();
}
