// middleware.ts
// 边缘层内存限流：作为无 Redis 单实例的兜底，并在有 Redis（生产多实例）时作为粗防护。
// 精确分布式限流由 lib/server/ratelimit（Node 端 Redis）在每个 API route 内完成。
// 为避免与 API 层精确限流双重计数影响正常用户，此处阈值放宽 2 倍，仅作边缘粗筛。
import { NextRequest, NextResponse } from 'next/server';

// 每个 IP 在窗口内的允许次数（×2 为边缘粗防护阈值，精确控制见 API 层）
const MULT = 2;
const LIMITS: Record<string, { windowMs: number; max: number }> = {
  '/api/interpret': { windowMs: 60_000, max: 15 * MULT },
  '/api/heming': { windowMs: 60_000, max: 8 * MULT },
  '/api/fortune': { windowMs: 60_000, max: 8 * MULT },
  '/api/chart': { windowMs: 60_000, max: 30 * MULT },
};

// 内存计数（Edge runtime 无法使用 ioredis；生产精确限流见 lib/server/ratelimit）
const hits = new Map<string, number[]>();

export function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const path = req.nextUrl.pathname;
  const rule = LIMITS[path];
  if (!rule) return NextResponse.next();

  const now = Date.now();
  const key = `${ip}:${path}`;
  const arr = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (arr.length >= rule.max) {
    return new Response(
      JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }
  arr.push(now);
  hits.set(key, arr);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/interpret', '/api/heming', '/api/fortune', '/api/chart'],
};
