import crypto from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

export function randomToken(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** URL-safe, lowercase, sortable-ish opaque id. */
export function newId(prefix: string): string {
  const buffer = crypto.randomBytes(10);
  let out = "";
  for (const byte of buffer) out += ALPHABET[byte % ALPHABET.length];
  return `${prefix}_${out}`;
}

export function bookingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buffer = crypto.randomBytes(6);
  let out = "";
  for (const byte of buffer) out += alphabet[byte % alphabet.length];
  return `NVS-${out}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
