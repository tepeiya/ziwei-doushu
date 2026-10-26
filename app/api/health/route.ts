/**
 * 健康检查端点（无鉴权，供平台探针 / 负载均衡 / 监控使用）
 * ─────────────────────────────────────────────────────────────
 * - DB：未设 DATABASE_URL 时视为「JSON 持久化模式」健康；
 *       设了则发一条 `SELECT 1` 探活（懒加载 Prisma，避免 import 期依赖）。
 * - Redis：未设 REDIS_URL 时视为「内存缓存模式」健康；
 *          设了则 ping 探活（懒加载 ioredis）。
 * 仅 DB 不健康才返回 503；Redis 为可选能力，缺失/异常不计为致命。
 */
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Probe {
  ok: boolean;
  configured: boolean;
  mode?: string;
  note?: string;
  error?: string;
}

async function checkDb(): Promise<Probe> {
  if (!process.env.DATABASE_URL) {
    return { ok: true, configured: false, mode: 'json', note: 'DATABASE_URL 未设置，使用 JSON 持久化' };
  }
  try {
    // 懒加载，避免无 DATABASE_URL 时也强制 require @prisma/client
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    await p.$queryRaw`SELECT 1`;
    await p.$disconnect();
    return { ok: true, configured: true, mode: 'postgres' };
  } catch (e) {
    return { ok: false, configured: true, mode: 'postgres', error: (e as Error).message };
  }
}

async function checkRedis(): Promise<Probe> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return { ok: true, configured: false, note: 'REDIS_URL 未设置，使用内存缓存' };
  }
  try {
    const Redis = require('ioredis');
    const r = new Redis(url, { lazyConnect: true, connectTimeout: 1500 });
    await r.ping();
    r.disconnect();
    return { ok: true, configured: true };
  } catch (e) {
    return { ok: false, configured: true, error: (e as Error).message };
  }
}

export async function GET(_req: NextRequest) {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
  const healthy = db.ok;
  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      ts: Date.now(),
      db,
      redis,
    },
    { status: healthy ? 200 : 503 },
  );
}
