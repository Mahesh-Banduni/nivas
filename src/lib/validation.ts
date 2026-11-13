import type { z } from "zod";
import { badRequest } from "./errors";

export function parseInput<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details: Record<string, string> = {};
    for (const issue of result.error.issues) {
      details[issue.path.join(".") || "form"] = issue.message;
    }
    throw badRequest("Please check the highlighted fields.", details);
  }
  return result.data;
}

export function parseFormData<S extends z.ZodTypeAny>(schema: S, formData: FormData): z.output<S> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key.endsWith("[]")) {
      const name = key.slice(0, -2);
      const existing = (raw[name] as unknown[]) ?? [];
      existing.push(value);
      raw[name] = existing;
    } else if (key in raw) {
      const existing = raw[key];
      raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      raw[key] = value;
    }
  }
  return parseInput(schema, raw);
}

export function emptyToNull(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
