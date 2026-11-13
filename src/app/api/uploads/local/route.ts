import { NextRequest } from "next/server";
import { badRequest, toErrorResponse } from "@/lib/errors";
import { decodeLocalUploadToken, isAllowedImageType, looksLikeImage, maxUploadBytes, putObject } from "@/infrastructure/cloudflare/r2";

/** Local stand-in for an R2 presigned PUT. Same method, same shape. */
export async function PUT(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) throw badRequest("Missing upload token");
    const decoded = decodeLocalUploadToken(token);
    if (!decoded) throw badRequest("Invalid upload token");
    if (!isAllowedImageType(decoded.contentType)) throw badRequest("Unsupported image type");

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length) throw badRequest("Empty upload");
    if (bytes.length > maxUploadBytes()) throw badRequest("Image is too large");
    if (!looksLikeImage(bytes)) throw badRequest("That file does not look like an image");

    const url = await putObject(decoded.key, bytes, decoded.contentType);
    return Response.json({ ok: true, key: decoded.key, url, size: bytes.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
