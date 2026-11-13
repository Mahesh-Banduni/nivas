import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { getWishlist, toggleWishlist } from "@/modules/wishlist/wishlist.service";

export async function GET() {
  try {
    const user = await requireApiUser();
    const wishlist = await getWishlist(user.id);
    return Response.json(wishlist);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = (await request.json()) as { propertyId?: string };
    const result = await toggleWishlist(user.id, String(body.propertyId ?? ""));
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
