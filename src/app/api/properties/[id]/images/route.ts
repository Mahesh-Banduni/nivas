import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { nowIso } from "@/lib/date";
import { badRequest, forbidden, notFound, toErrorResponse } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { requireApiUser } from "@/modules/auth/session";
import { deleteObject, isSafeKey } from "@/infrastructure/cloudflare/r2";
import { invalidate } from "@/infrastructure/cloudflare/kv";

async function requireOwner(propertyId: string, userId: string, roles: string[]) {
  const db = await getDb();
  const property = await db
    .prepare("SELECT id, owner_id FROM properties WHERE id = ?")
    .bind(propertyId)
    .first<{ id: string; owner_id: string }>();
  if (!property) throw notFound("Listing not found");
  if (property.owner_id !== userId && !roles.includes("admin")) {
    throw forbidden("You can only edit your own listings");
  }
  return db;
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const db = await requireOwner(id, user.id, user.roles);
    const body = (await request.json()) as { key?: string; url?: string; alt?: string };
    const key = String(body.key ?? "");
    if (!key || !isSafeKey(key)) throw badRequest("Invalid media key");

    const existing = await db
      .prepare("SELECT position FROM property_images WHERE property_id = ? ORDER BY position DESC LIMIT 1")
      .bind(id)
      .first<{ position: number }>();
    const imageId = newId("pim");
    await db
      .prepare(
        "INSERT INTO property_images (id, property_id, r2_key, url, alt, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        imageId,
        id,
        key,
        body.url ?? null,
        body.alt ?? null,
        (existing?.position ?? -1) + 1,
        nowIso(),
      )
      .run();
    await invalidate("search:");
    await invalidate("home:");
    return Response.json({ id: imageId, key }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const db = await requireOwner(id, user.id, user.roles);
    const images = await db
      .prepare("SELECT * FROM property_images WHERE property_id = ? ORDER BY position ASC")
      .bind(id)
      .all();
    return Response.json({ items: images });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const db = await requireOwner(id, user.id, user.roles);
    const imageId = request.nextUrl.searchParams.get("imageId");
    if (!imageId) throw badRequest("Missing imageId");
    const image = await db
      .prepare("SELECT r2_key FROM property_images WHERE id = ? AND property_id = ?")
      .bind(imageId, id)
      .first<{ r2_key: string }>();
    if (!image) throw notFound("Photo not found");
    await db.prepare("DELETE FROM property_images WHERE id = ? AND property_id = ?").bind(imageId, id).run();
    await deleteObject(image.r2_key).catch(() => undefined);
    await invalidate("search:");
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
