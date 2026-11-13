import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { createReview } from "@/modules/reviews/review.service";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    const score = (value: unknown) => Math.min(5, Math.max(1, Number(value ?? 5)));
    const result = await createReview({
      guestId: user.id,
      bookingId: id,
      rating: score(body.rating),
      cleanliness: score(body.cleanliness),
      accuracy: score(body.accuracy),
      communication: score(body.communication),
      location: score(body.location),
      value: score(body.value),
      comment: String(body.comment ?? "").slice(0, 2000),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
