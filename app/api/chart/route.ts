// app/api/chart/route.ts
// 服务端排盘接口：接收 BirthInfo，调用内置排盘引擎，结果按生辰哈希缓存。
// 把算力收敛到服务端，便于缓存、计费与防刷（相比浏览器端 generateChart）。

import type { NextRequest } from 'next/server';
import { generateChart } from '@/lib/ziwei/algorithm';
import { cacheGet, cacheSet, cacheKeyForBirth } from '@/lib/server/cache';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let info: BirthInfo;
  try {
    info = (await req.json()) as BirthInfo;
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  if (
    !info ||
    typeof info.year !== 'number' ||
    typeof info.month !== 'number' ||
    typeof info.day !== 'number' ||
    typeof info.hour !== 'number' ||
    (info.gender !== 'male' && info.gender !== 'female')
  ) {
    return Response.json({ error: '出生信息不完整或格式错误' }, { status: 400 });
  }

  const key = cacheKeyForBirth(info);
  const hit = cacheGet(key);
  if (hit) {
    return Response.json({ chart: JSON.parse(hit) as ZiweiChart, cached: true });
  }

  let chart: ZiweiChart;
  try {
    chart = generateChart(info);
  } catch (e) {
    return Response.json(
      { error: '排盘失败：' + (e instanceof Error ? e.message : String(e)) },
      { status: 400 },
    );
  }

  cacheSet(key, JSON.stringify(chart));
  return Response.json({ chart, cached: false });
}
