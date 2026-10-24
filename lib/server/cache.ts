// lib/server/cache.ts
// 服务端缓存：优先 Redis（多实例共享、重启不丢），未配置 REDIS_URL 时回退进程内内存。
// cacheGet/Set/Del 为 async（Redis 是异步存储）；cacheKeyForBirth 仍为同步纯函数。
// Redis 故障时自动降级到内存，不影响主流程（redisOk 标志位持久，进程重启后恢复尝试）。
import Redis from 'ioredis';

type Entry = { value: string; expires: number };
const memory = new Map<string, Entry>();

const REDIS_URL = process.env.REDIS_URL;
let redis: Redis | null = null;
let redisOk = REDIS_URL ? true : false;

function client(): Redis | null {
  if (!REDIS_URL) return null;
  if (redisOk && !redis) {
    try {
      redis = new Redis(REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // 不自动重连，交由 redisOk 降级到内存
      });
      redis.on('error', () => {
        redisOk = false;
      });
    } catch {
      redisOk = false;
      return null;
    }
  }
  return redisOk ? redis : null;
}

export async function cacheGet(key: string): Promise<string | null> {
  const r = client();
  if (r) {
    try {
      const v = await r.get(key);
      return v ?? null;
    } catch {
      redisOk = false;
    }
  }
  const e = memory.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return e.value;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000, // 默认 30 天
): Promise<void> {
  const r = client();
  if (r) {
    try {
      await r.set(key, value, 'PX', ttlMs);
      return;
    } catch {
      redisOk = false;
    }
  }
  memory.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cacheDel(key: string): Promise<void> {
  const r = client();
  if (r) {
    try {
      await r.del(key);
    } catch {
      redisOk = false;
    }
  }
  memory.delete(key);
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
