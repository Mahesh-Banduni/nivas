import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { createHold, listMyBookings } from "@/modules/bookings/booking.service";

export async function GET() {
  try {
    const user = await requireApiUser();
    const bookings = await listMyBookings(user.id);
    return Response.json({ items: bookings });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = (await request.json()) as {
      propertyId?: string;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
    };
    const hold = await createHold(user.id, {
      propertyId: String(body.propertyId ?? ""),
      checkIn: String(body.checkIn ?? ""),
      checkOut: String(body.checkOut ?? ""),
      guests: Number(body.guests ?? 1),
    });
    return Response.json(hold, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
