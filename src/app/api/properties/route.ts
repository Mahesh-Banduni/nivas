import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { searchMarketplace } from "@/modules/properties/property.service";
import type { SearchFilters } from "@/modules/properties/property.repository";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const filters: SearchFilters = {
      city: params.get("city") ?? undefined,
      type: params.get("type") ?? undefined,
      guests: params.get("guests") ? Number(params.get("guests")) : undefined,
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) * 100 : undefined,
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) * 100 : undefined,
      checkIn: params.get("checkIn") ?? undefined,
      checkOut: params.get("checkOut") ?? undefined,
      amenities: params.getAll("amenity"),
      sort: (params.get("sort") as SearchFilters["sort"]) ?? undefined,
      page: params.get("page") ? Number(params.get("page")) : 1,
      perPage: params.get("perPage") ? Number(params.get("perPage")) : 12,
    };
    const result = await searchMarketplace(filters);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
