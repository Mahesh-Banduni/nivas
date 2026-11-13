import { z } from "zod";

export const PROPERTY_TYPES = [
  "villa",
  "apartment",
  "heritage",
  "cabin",
  "beach house",
  "farmhouse",
  "suite",
  "studio",
] as const;

export const propertyInputSchema = z
  .object({
    title: z.string().trim().min(6, "Give your listing a descriptive title").max(90),
    description: z.string().trim().min(80, "Write at least a short paragraph (80 characters)").max(4000),
    propertyType: z.enum(PROPERTY_TYPES),
    city: z.string().trim().min(2, "City is required").max(60),
    state: z.string().trim().min(2, "State is required").max(60),
    neighborhood: z.string().trim().max(80).optional(),
    nightlyPrice: z.coerce.number().int().min(500, "Minimum ₹500 per night").max(2_000_000),
    cleaningFee: z.coerce.number().int().min(0).max(200_000).default(0),
    maxGuests: z.coerce.number().int().min(1).max(30),
    bedrooms: z.coerce.number().int().min(1).max(20),
    beds: z.coerce.number().int().min(1).max(30),
    bathrooms: z.coerce.number().int().min(1).max(20),
    minNights: z.coerce.number().int().min(1).max(30).default(1),
    maxNights: z.coerce.number().int().min(1).max(180).default(30),
    cancellationPolicy: z.enum(["flexible", "moderate", "strict"]).default("moderate"),
    checkInTime: z.string().trim().default("14:00"),
    checkOutTime: z.string().trim().default("11:00"),
    houseRules: z.string().trim().max(1000).optional(),
    amenities: z.array(z.string()).default([]),
    latitude: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().min(-90).max(90).optional(),
    ),
    longitude: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().min(-180).max(180).optional(),
    ),
  })
  .refine((value) => value.maxNights >= value.minNights, {
    message: "Maximum nights must be at least the minimum",
    path: ["maxNights"],
  });

export type PropertyInput = z.infer<typeof propertyInputSchema>;

export const propertyModerationSchema = z.object({
  propertyId: z.string().min(1),
  decision: z.enum(["approve", "reject", "suspend", "restore"]),
  note: z.string().trim().max(300).optional(),
});
