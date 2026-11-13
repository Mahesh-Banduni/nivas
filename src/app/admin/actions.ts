"use server";

import { revalidatePath } from "next/cache";
import { badRequest } from "@/lib/errors";
import { requireRole } from "@/modules/auth/session";
import {
  moderateProperty,
  setPropertyFeatured,
  setUserStatus,
  verifyOwner,
} from "@/modules/admin/admin.service";
import { setReviewVisibility } from "@/modules/reviews/review.service";

function field(formData: FormData, name: string, fallback = ""): string {
  return String(formData.get(name) ?? fallback);
}

function refreshModeration() {
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/owner/properties");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function moderatePropertyAction(formData: FormData) {
  const user = await requireRole("admin", "/admin/moderation");
  const propertyId = field(formData, "propertyId");
  const decision = field(formData, "decision") as "approve" | "reject" | "suspend" | "restore";
  if (!propertyId) throw badRequest("Missing listing");
  if (!["approve", "reject", "suspend", "restore"].includes(decision)) {
    throw badRequest("Unknown moderation decision");
  }
  await moderateProperty({
    adminId: user.id,
    propertyId,
    decision,
    note: field(formData, "note") || undefined,
  });
  refreshModeration();
}

export async function featurePropertyAction(formData: FormData) {
  const user = await requireRole("admin", "/admin/moderation");
  const propertyId = field(formData, "propertyId");
  if (!propertyId) throw badRequest("Missing listing");
  await setPropertyFeatured(user.id, propertyId, field(formData, "featured") === "1");
  refreshModeration();
}

export async function setUserStatusAction(formData: FormData) {
  const user = await requireRole("admin", "/admin/users");
  const userId = field(formData, "userId");
  const status = field(formData, "status");
  if (!userId || !["active", "suspended"].includes(status)) throw badRequest("Invalid account update");
  await setUserStatus(user.id, userId, status as "active" | "suspended");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function verifyOwnerAction(formData: FormData) {
  const user = await requireRole("admin", "/admin/users");
  const userId = field(formData, "userId");
  if (!userId) throw badRequest("Missing host");
  await verifyOwner(user.id, userId);
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function setReviewVisibilityAction(formData: FormData) {
  const user = await requireRole("admin", "/admin/reviews");
  const reviewId = field(formData, "reviewId");
  const status = field(formData, "status");
  if (!reviewId || !["published", "hidden"].includes(status)) throw badRequest("Invalid review update");
  await setReviewVisibility(reviewId, status as "published" | "hidden");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}
