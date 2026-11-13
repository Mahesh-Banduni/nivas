import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    fullName: z.string().trim().min(2, "Tell us your name").max(80),
    password: z.string().min(8, "Use at least 8 characters").max(200),
    role: z.enum(["guest", "owner"]).default("guest"),
    businessName: z.string().trim().max(80).optional(),
  })
  .refine((data) => data.role !== "owner" || (data.businessName?.length ?? 0) >= 2, {
    message: "Add the name you host under",
    path: ["businessName"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const becomeOwnerSchema = z.object({
  businessName: z.string().trim().min(2, "Add the name you host under").max(80),
  bio: z.string().trim().max(600).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
