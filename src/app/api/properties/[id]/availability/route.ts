import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { addDays, todayISO } from "@/lib/date";
import { toErrorResponse } from "@/lib/errors";
import { getCalendar } from "@/modules/availability/availability.repository";
import { findPropertyById } from "@/modules/properties/property.repository";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const db = await getDb();
    const property = await findPropertyById(db, id);
    if (!property) return Response.json({ error: "Property not found" }, { status: 404 });

    const from = request.nextUrl.searchParams.get("from") ?? todayISO();
    const to = request.nextUrl.searchParams.get("to") ?? addDays(from, 120);
    const calendar = await getCalendar(db, id, from, to);
    return Response.json({ from, to, calendar });
  } catch (error) {
    return toErrorResponse(error);
  }
}
