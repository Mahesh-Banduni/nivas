import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { badRequest, forbidden, notFound, toErrorResponse } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { requireApiUser } from "@/modules/auth/session";
import { createPresignedUpload, isAllowedImageType, maxUploadBytes } from "@/infrastructure/cloudflare/r2";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    if (!user.roles.includes("owner") && !user.roles.includes("admin")) {
      throw forbidden("Only hosts can upload listing photos");
    }

    const body = (await request.json()) as {
      propertyId?: string;
      filename?: string;
      contentType?: string;
      contentLength?: number;
    };
    const propertyId = String(body.propertyId ?? "");
    const contentType = String(body.contentType ?? "");
    const contentLength = Number(body.contentLength ?? 0);

    if (!isAllowedImageType(contentType)) {
      throw badRequest("Upload a JPEG, PNG, WebP or AVIF image");
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maxUploadBytes()) {
      throw badRequest(`Images must be under ${Math.round(maxUploadBytes() / 1024 / 1024)} MB`);
    }

    const db = await getDb();
    const property = await db
      .prepare("SELECT id, owner_id FROM properties WHERE id = ?")
      .bind(propertyId)
      .first<{ id: string; owner_id: string }>();
    if (!property) throw notFound("Listing not found");
    if (property.owner_id !== user.id && !user.roles.includes("admin")) {
      throw forbidden("You can only add photos to your own listings");
    }

    const key = `properties/${propertyId}/${newId("img")}.${EXTENSIONS[contentType]}`;
    const presigned = await createPresignedUpload({ key, contentType, contentLength });
    return Response.json(presigned);
  } catch (error) {
    return toErrorResponse(error);
  }
}
