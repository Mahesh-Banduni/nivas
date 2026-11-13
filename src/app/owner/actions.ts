"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseFormData } from "@/lib/validation";
import { AppError, badRequest, messageOf } from "@/lib/errors";
import { requireRole } from "@/modules/auth/session";
import { propertyInputSchema } from "@/modules/properties/property.schema";
import {
  createListing,
  submitForReview,
  updateListing,
} from "@/modules/properties/property.service";
import { cancelBooking } from "@/modules/bookings/booking.service";
import { blockDates } from "@/modules/owners/owner.service";

export interface PropertyFormState {
  error?: string;
  details?: Record<string, string>;
  saved?: boolean;
}

function stateFromError(error: unknown): PropertyFormState {
  if (error instanceof AppError) {
    return { error: error.message, details: error.details };
  }
  return { error: messageOf(error, "Could not save this listing") };
}

export async function savePropertyAction(
  _previous: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  try {
    const user = await requireRole("owner", "/owner/properties/new");
    const input = parseFormData(propertyInputSchema, formData);
    const propertyId = String(formData.get("propertyId") ?? "");

    if (propertyId) {
      await updateListing(user.id, propertyId, input);
      revalidatePath("/owner/properties");
      revalidatePath(`/owner/properties/${propertyId}/edit`);
      return { saved: true };
    }

    const created = await createListing(user.id, input);
    revalidatePath("/owner/properties");
    redirect(`/owner/properties/${created.id}/edit?created=1`);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return stateFromError(error);
  }
}

export async function submitListingAction(formData: FormData) {
  const user = await requireRole("owner", "/owner/properties");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) throw badRequest("Missing listing");
  await submitForReview(user.id, propertyId);
  revalidatePath("/owner/properties");
  revalidatePath(`/owner/properties/${propertyId}/edit`);
}

export async function ownerCancelBookingAction(formData: FormData) {
  const user = await requireRole("owner", "/owner/bookings");
  const bookingId = String(formData.get("bookingId") ?? "");
  await cancelBooking({
    actorId: user.id,
    roles: user.roles,
    bookingId,
    reason: String(formData.get("reason") ?? "Cancelled by host"),
  });
  revalidatePath("/owner/bookings");
  revalidatePath("/owner");
}

export async function blockDatesAction(formData: FormData) {
  const user = await requireRole("owner", "/owner/calendar");
  const propertyId = String(formData.get("propertyId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  if (!propertyId || !startDate || !endDate) throw badRequest("Choose a listing and date range");
  if (endDate <= startDate) throw badRequest("End date must be after the start date");
  await blockDates(user.id, propertyId, startDate, endDate);
  revalidatePath("/owner/calendar");
}
