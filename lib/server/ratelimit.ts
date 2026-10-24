// lib/server/ratelimit.ts
// 分布式限流：优先 Redis（多实例共享计数），未配置 REDIS_URL 时回退进程内内存。
// 固定窗口计数。供 Node runtime 的 API route 调用。
// 注意：Next.js middleware 运行在 Edge runtime，无法使用 ioredis，因此分布式限流
//       必须放在 API 层（本文件），middleware 仅保留内存粗防护（见 middleware.ts）。
import Redis from 'ioredis';
import type { NextRequest } from 'next/server';

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
        retryStrategy: () => null,
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

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // 该窗口重置的 epoch 毫秒
}

export async function rateLimit(opts: {
  key: string;
  windowMs: number;
  max: number;
}): Promise<RateLimitResult> {
  const { key, windowMs, max } = opts;
  const r = client();
  if (r) {
    try {
      // 固定窗口：INCR 自增；首次设置 TTL。允许极小竞态，限流场景可接受。
      const count = await r.incr(key);
      if (count === 1) await r.pexpire(key, windowMs);
      const ttl = await r.pttl(key);
      const reset = Date.now() + (ttl > 0 ? ttl : windowMs);
      return {
        success: count <= max,
        remaining: Math.max(0, max - count),
        reset,
      };
    } catch {
      redisOk = false;
    }
  }
  return memoryRateLimit(key, windowMs, max);
}

// ── 内存回退（单实例）──
const mem = new Map<string, { count: number; expires: number }>();
function memoryRateLimit(
  key: string,
  windowMs: number,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.expires < now) {
    mem.set(key, { count: 1, expires: now + windowMs });
    return { success: 1 <= max, remaining: Math.max(0, max - 1), reset: now + windowMs };
  }
  e.count += 1;
  return {
    success: e.count <= max,
    remaining: Math.max(0, max - e.count),
    reset: e.expires,
  };
}

// 从请求中提取客户端 IP（兼容反代 x-forwarded-for / x-real-ip / Next req.ip）。
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}
