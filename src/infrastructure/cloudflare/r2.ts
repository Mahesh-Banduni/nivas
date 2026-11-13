import fs from "node:fs/promises";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";
import { getCloudflareEnv, secret } from "./env";

/**
 * Media storage.
 * - Production: R2 bucket binding (private bucket + public media domain).
 * - Local: files under .data/media, served by /api/media/[...key].
 */

const MEDIA_ROOT = path.join(process.cwd(), ".data", "media");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export const UPLOAD_URL_TTL_SECONDS = 300;

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

export async function putObject(key: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const env = await getCloudflareEnv();
  if (env.PROPERTY_MEDIA) {
    await env.PROPERTY_MEDIA.put(key, bytes, { httpMetadata: { contentType } });
    return `/api/media/${key}`;
  }
  const target = path.join(MEDIA_ROOT, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  return `/api/media/${key}`;
}

export async function getObject(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const env = await getCloudflareEnv();
  if (env.PROPERTY_MEDIA) {
    const object = await env.PROPERTY_MEDIA.get(key);
    if (!object) return null;
    const buffer = new Uint8Array(await new Response(object.body).arrayBuffer());
    return { body: buffer, contentType: object.httpMetadata?.contentType ?? "application/octet-stream" };
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
  const env = await getCloudflareEnv();
  if (env.PROPERTY_MEDIA) {
    await env.PROPERTY_MEDIA.delete(key);
    return;
  }
  await fs.rm(path.join(MEDIA_ROOT, key), { force: true });
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

/**
 * AWS SigV4 presigned PUT for the R2 S3 endpoint. Implemented with node:crypto
 * so the app doesn't need the full AWS SDK.
 */
function presignR2Put(input: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  expiresIn: number;
}): string {
  const host = `${input.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${input.bucket}/${input.key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresIn),
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalQuery = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Direct browser-to-R2 upload authorisation. Production returns a real SigV4
 * presigned S3 URL; locally it returns a short-lived URL to our own PUT
 * endpoint so the client flow is identical.
 */
export async function createPresignedUpload(input: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; method: "PUT"; expiresIn: number; objectKey: string }> {
  const env = await getCloudflareEnv();
  const accountId = secret("R2_ACCOUNT_ID");
  const accessKeyId = secret("R2_ACCESS_KEY_ID");
  const secretAccessKey = secret("R2_SECRET_ACCESS_KEY");
  if (env.PROPERTY_MEDIA && accountId && accessKeyId && secretAccessKey) {
    const uploadUrl = presignR2Put({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket: secret("R2_BUCKET_NAME", "nivas-property-media"),
      key: input.key,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
    return { uploadUrl, method: "PUT", expiresIn: UPLOAD_URL_TTL_SECONDS, objectKey: input.key };
  }
  if (env.PROPERTY_MEDIA) {
    throw new Error("R2 uploads require R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.");
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
