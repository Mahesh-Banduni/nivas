import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { quoteStay } from "@/modules/bookings/booking.service";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await quoteStay({
      propertyId: params.get("propertyId") ?? "",
      checkIn: params.get("checkIn") ?? "",
      checkOut: params.get("checkOut") ?? "",
      guests: Number(params.get("guests") ?? 1),
    });
    return Response.json({
      nights: result.nights,
      quote: result.quote,
      rules: result.rules,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
