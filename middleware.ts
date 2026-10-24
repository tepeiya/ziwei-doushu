// middleware.ts
// 限流与防刷：对高成本的 AI 解读 / 排盘接口按 IP 做滑动窗口频次限制，
// 避免接口被白嫖。生产环境建议将计数迁移到 Redis（见 lib/server/cache.ts）。
import { NextRequest, NextResponse } from 'next/server';

// 每个 IP 在窗口内的允许次数
const LIMITS: Record<string, { windowMs: number; max: number }> = {
  '/api/interpret': { windowMs: 60_000, max: 15 },
  '/api/heming': { windowMs: 60_000, max: 8 },
  '/api/fortune': { windowMs: 60_000, max: 8 },
  '/api/chart': { windowMs: 60_000, max: 30 },
};

// 内存计数（演示用；多实例部署请用 Redis）
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
