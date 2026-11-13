import fs from "node:fs/promises";
import path from "node:path";
import { getCloudflareEnv, secret } from "@/infrastructure/cloudflare/env";

const MEDIA_ROOT = path.join(process.cwd(), ".data", "media");
const DEFAULT_BUCKET = "nivas-property-media";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export const UPLOAD_URL_TTL_SECONDS = 2 * 60 * 60;

type SupabaseStorageConfig = {
  baseUrl: string;
  bucket: string;
  serviceRoleKey: string;
};

export function isAllowedImageType(contentType: string) {
  return ALLOWED_TYPES.has(contentType);
}

export function maxUploadBytes() {
  return MAX_BYTES;
}

/** Basic magic-number sniffing — never trust the browser's content-type alone. */
export function looksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const b = bytes;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  const avif = b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
  return jpeg || png || webp || avif;
}

async function getSupabaseStorageConfig(): Promise<SupabaseStorageConfig | null> {
  const env = await getCloudflareEnv();
  const supabaseUrl = secret("SUPABASE_URL").trim();
  const serviceRoleKey = secret("SUPABASE_SERVICE_ROLE_KEY").trim();
  const bucket = secret("SUPABASE_STORAGE_BUCKET", DEFAULT_BUCKET).trim() || DEFAULT_BUCKET;

  if (!supabaseUrl && !serviceRoleKey) {
    if (env.APP_ENV === "production" || process.env.APP_ENV === "production") {
      throw new Error("Supabase Storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    return null;
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Storage requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const parsedUrl = new URL(supabaseUrl);
  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.hostname !== "localhost" &&
    parsedUrl.hostname !== "127.0.0.1"
  ) {
    throw new Error("SUPABASE_URL must use HTTPS.");
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/+$/, "")}/storage/v1`,
    bucket,
    serviceRoleKey,
  };
}

function objectPath(bucket: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${encodeURIComponent(bucket)}/${encodedKey}`;
}

function authHeaders(config: SupabaseStorageConfig): Record<string, string> {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

async function requireSuccessfulResponse(response: Response): Promise<void> {
  if (response.ok) return;
  const detail = (await response.text()).slice(0, 500);
  throw new Error(`Supabase Storage request failed (${response.status}): ${detail}`);
}

export async function putObject(key: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const config = await getSupabaseStorageConfig();
  if (config) {
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    const response = await fetch(`${config.baseUrl}/object/${objectPath(config.bucket, key)}`, {
      method: "POST",
      headers: {
        ...authHeaders(config),
        "Content-Type": contentType,
      },
      body,
    });
    await requireSuccessfulResponse(response);
  } else {
    const target = path.join(MEDIA_ROOT, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
  return `/api/media/${key}`;
}

export async function getObject(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const config = await getSupabaseStorageConfig();
  if (config) {
    const response = await fetch(
      `${config.baseUrl}/object/${objectPath(config.bucket, key)}`,
      { headers: authHeaders(config) },
    );
    if (response.status === 404) return null;
    await requireSuccessfulResponse(response);
    return {
      body: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  try {
    const target = path.join(MEDIA_ROOT, key);
    const body = new Uint8Array(await fs.readFile(target));
    const ext = path.extname(key).slice(1);
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "avif" ? "image/avif" : "image/jpeg";
    return { body, contentType };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const config = await getSupabaseStorageConfig();
  if (config) {
    const response = await fetch(`${config.baseUrl}/object/${encodeURIComponent(config.bucket)}`, {
      method: "DELETE",
      headers: {
        ...authHeaders(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [key] }),
    });
    await requireSuccessfulResponse(response);
    return;
  }
  await fs.rm(path.join(MEDIA_ROOT, key), { force: true });
}

/**
 * Direct browser-to-Supabase upload authorization. Local development uses a
 * short-lived upload token and the same PUT endpoint shape.
 */
export async function createPresignedUpload(input: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; method: "PUT"; expiresIn: number; objectKey: string }> {
  const config = await getSupabaseStorageConfig();
  if (config) {
    const response = await fetch(
      `${config.baseUrl}/object/upload/sign/${objectPath(config.bucket, input.key)}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(config),
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    await requireSuccessfulResponse(response);
    const signed = (await response.json()) as { url?: unknown };
    if (typeof signed.url !== "string") {
      throw new Error("Supabase Storage did not return a signed upload URL.");
    }
    const uploadUrl = signed.url.startsWith("http")
      ? new URL(signed.url).toString()
      : `${config.baseUrl}${signed.url.startsWith("/") ? signed.url : `/${signed.url}`}`;
    return {
      uploadUrl,
      method: "PUT",
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      objectKey: input.key,
    };
  }

  const token = Buffer.from(`${input.key}|${input.contentType}`).toString("base64url");
  return {
    uploadUrl: `/api/uploads/local?token=${encodeURIComponent(token)}`,
    method: "PUT",
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    objectKey: input.key,
  };
}

export function decodeLocalUploadToken(token: string): { key: string; contentType: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const separator = decoded.lastIndexOf("|");
    if (separator < 0) return null;
    const key = decoded.slice(0, separator);
    const contentType = decoded.slice(separator + 1);
    if (!isSafeKey(key)) return null;
    return { key, contentType };
  } catch {
    return null;
  }
}

export function isSafeKey(key: string): boolean {
  return (
    /^[a-zA-Z0-9/_.-]+$/.test(key) &&
    !key.includes("..") &&
    !key.startsWith("/") &&
    key.length < 200
  );
}
