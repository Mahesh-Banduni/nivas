import { getDb } from "@/db";
import type { PropertyCardData } from "@/db/types";
import { nowIso } from "@/lib/date";

async function ensureWishlist(userId: string) {
  const db = await getDb();
  const existing = await db
    .prepare("SELECT id FROM wishlists WHERE user_id = ? ORDER BY created_at ASC LIMIT 1")
    .bind(userId)
    .first<{ id: string }>();
  if (existing) return existing.id;
  const id = `wsh_${userId.slice(-6)}`;
  await db
    .prepare("INSERT INTO wishlists (id, user_id, name, created_at) VALUES (?, ?, 'Saved stays', ?)")
    .bind(id, userId, nowIso())
    .run();
  return id;
}

export async function getWishlist(userId: string) {
  const db = await getDb();
  const wishlistId = await ensureWishlist(userId);
  const items = await db
    .prepare(
      `SELECT p.*, u.full_name AS owner_name,
              (SELECT i.r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_key,
              (SELECT i.url FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_url,
              (SELECT group_concat(a.name, '|') FROM property_amenities pa JOIN amenities a ON a.id = pa.amenity_id WHERE pa.property_id = p.id) AS amenity_names,
              wi.created_at AS saved_at
       FROM wishlist_items wi
       JOIN properties p ON p.id = wi.property_id
       JOIN users u ON u.id = p.owner_id
       WHERE wi.wishlist_id = ? AND p.status = 'published'
       ORDER BY wi.created_at DESC`,
    )
    .bind(wishlistId)
    .all<PropertyCardData & { saved_at: string }>();
  return { wishlistId, items };
}

export async function savedPropertyIds(userId: string) {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT wi.property_id FROM wishlist_items wi
       JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = ?`,
    )
    .bind(userId)
    .all<{ property_id: string }>();
  return rows.map((row) => row.property_id);
}

export async function toggleWishlist(userId: string, propertyId: string) {
  const db = await getDb();
  const wishlistId = await ensureWishlist(userId);
  const existing = await db
    .prepare("SELECT 1 AS ok FROM wishlist_items WHERE wishlist_id = ? AND property_id = ?")
    .bind(wishlistId, propertyId)
    .first<{ ok: number }>();

  if (existing) {
    await db
      .prepare("DELETE FROM wishlist_items WHERE wishlist_id = ? AND property_id = ?")
      .bind(wishlistId, propertyId)
      .run();
    return { saved: false };
  }

  await db
    .prepare("INSERT INTO wishlist_items (wishlist_id, property_id, created_at) VALUES (?, ?, ?)")
    .bind(wishlistId, propertyId, nowIso())
    .run();
  return { saved: true };
}
