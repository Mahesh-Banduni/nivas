import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { getBookingForUser } from "@/modules/bookings/booking.service";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const booking = await getBookingForUser(user.id, user.roles, id);
    return Response.json({ booking });
  } catch (error) {
    return toErrorResponse(error);
  }
}
