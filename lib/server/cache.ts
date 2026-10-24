// lib/server/cache.ts
// 轻量内存缓存（同步接口，单进程有效）。
// 生产环境建议换成 Redis（ioredis 已在依赖中）：将下方实现替换为
//   import Redis from 'ioredis'; const r = new Redis(process.env.REDIS_URL)
// 并保持相同 get/set 语义即可。

type Entry = { value: string; expires: number };

const store = new Map<string, Entry>();

export function cacheGet(key: string): string | null {
  const e = store.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return e.value;
}

export function cacheSet(
  key: string,
  value: string,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000, // 默认 30 天
): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheDel(key: string): void {
  store.delete(key);
}

export function cacheKeyForBirth(info: {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: string;
  longitude?: number;
}): string {
  return `chart:${info.year}-${info.month}-${info.day}-${info.hour}-${info.gender}-${info.longitude ?? ''}`;
}
