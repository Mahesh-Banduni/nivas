import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { cancelBooking } from "@/modules/bookings/booking.service";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const result = await cancelBooking({
      actorId: user.id,
      roles: user.roles,
      bookingId: id,
      reason: body.reason,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
