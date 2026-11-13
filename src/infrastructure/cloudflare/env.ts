import type { Database } from "@/db/database";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Minimal structural types for the Cloudflare bindings we use. Keeping them
 * local avoids a hard dependency on @cloudflare/workers-types in the Next
 * build, while still being exactly what OpenNext hands us at runtime.
 */
export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number; last_row_id?: number };
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<D1Result[]>;
  exec(sql: string): Promise<unknown>;
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface QueueProducerLike {
  send(message: unknown, options?: { delaySeconds?: number }): Promise<void>;
}

declare global {
  interface CloudflareEnv {
    DB?: D1DatabaseLike;
    CACHE?: KVNamespaceLike;
    BOOKING_QUEUE?: QueueProducerLike;
    APP_ENV?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_STORAGE_BUCKET?: string;
    SUPPORT_EMAIL?: string;
  }

  // Populated by the OpenNext Cloudflare adapter at runtime.
  // eslint-disable-next-line no-var
  var __nivasEnv: CloudflareEnv | undefined;
}

/**
 * Returns OpenNext bindings on Workers. Local Node development and tests use
 * the SQLite and filesystem adapters unless NIVAS_USE_CLOUDFLARE=true.
 */
export async function getCloudflareEnv(): Promise<CloudflareEnv> {
  if (globalThis.__nivasEnv) return globalThis.__nivasEnv;
  if (useLocalAdapters()) return {};

  try {
    const { env } = await getCloudflareContext({ async: true });
    globalThis.__nivasEnv = env;
    return env;
  } catch (error) {
    if (isMissingCloudflareContext(error) && process.env.APP_ENV !== "production") return {};
    throw error;
  }
}

export async function getCloudflareDb(): Promise<Database | null> {
  const env = await getCloudflareEnv();
  if (env.DB) return new (await import("./d1")).D1Adapter(env.DB);
  if (env.APP_ENV === "production" || process.env.APP_ENV === "production") {
    throw new Error("Cloudflare D1 binding DB is required in production.");
  }
  return null;
}

export function runtimeName(): "cloudflare" | "local" {
  return globalThis.__nivasEnv ? "cloudflare" : "local";
}

export function secret(name: string): string {
  const env = cloudflareEnvSync();
  const fromEnv = Object.getOwnPropertyDescriptor(env, name)?.value as unknown;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  return process.env[name] ?? "";
}

function cloudflareEnvSync(): CloudflareEnv {
  if (globalThis.__nivasEnv) return globalThis.__nivasEnv;
  if (useLocalAdapters()) return {};

  try {
    const { env } = getCloudflareContext();
    globalThis.__nivasEnv = env;
    return env;
  } catch (error) {
    if (isMissingCloudflareContext(error) && process.env.APP_ENV !== "production") return {};
    throw error;
  }
}

function useLocalAdapters(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && process.env.NIVAS_USE_CLOUDFLARE !== "true")
  );
}

function isMissingCloudflareContext(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("getCloudflareContext` has been called without having called")
  );
}
