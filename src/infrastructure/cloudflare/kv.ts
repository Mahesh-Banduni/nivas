import { getCloudflareEnv } from "./env";

/**
 * Read-through cache. Uses the CACHE KV namespace in production and an
 * in-process map locally. Public discovery data only — availability and
 * prices are always revalidated against D1 before a hold is created.
 */

type Entry = { value: string; expiresAt: number };

const globalForCache = globalThis as unknown as { __nivasCache?: Map<string, Entry> };
const memory = (globalForCache.__nivasCache ??= new Map());

export async function cacheGet<T>(key: string): Promise<T | null> {
  const env = await getCloudflareEnv();
  if (env.CACHE) {
    const raw = await env.CACHE.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 120): Promise<void> {
  const env = await getCloudflareEnv();
  const serialized = JSON.stringify(value);
  if (env.CACHE) {
    await env.CACHE.put(key, serialized, { expirationTtl: ttlSeconds });
    return;
  }
  memory.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export async function invalidate(prefix: string): Promise<void> {
  const env = await getCloudflareEnv();
  if (env.CACHE) return; // KV bulk invalidation is done by key versioning in production
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export function cacheStats() {
  return { entries: memory.size };
}
