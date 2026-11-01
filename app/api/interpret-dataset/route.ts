// app/api/interpret-dataset/route.ts
// 离线解读接口：读取 v4.0 解读数据集（.data/ziwei-interp-v4/），按出生信息返回 13 维解读。
// 与 /api/interpret（AI 流式）互补：本接口零成本、确定性、无需 API Key，适合做“原生解读”展示。

import type { NextRequest } from 'next/server';
import { getV4Interpretation, V4_DIMENSIONS, V4_YEAR_MIN, V4_YEAR_MAX } from '@/lib/server/interp-v4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BirthInput {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  gender?: unknown;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export async function POST(req: NextRequest) {
  let body: { birth?: BirthInput } & BirthInput;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // 兼容 {birth:{...}} 或平铺 {year,month,...}
  const src: BirthInput = (body && typeof body.birth === 'object' && body.birth ? body.birth : body) as BirthInput;

  const year = num(src.year);
  const month = num(src.month);
  const day = num(src.day);
  const hour = num(src.hour);
  const gender = src.gender === 'male' || src.gender === 'female' ? src.gender : null;

  if (
    year == null ||
    month == null ||
    day == null ||
    hour == null ||
    gender == null ||
    year < V4_YEAR_MIN ||
    year > V4_YEAR_MAX ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 11
  ) {
    return new Response(
      JSON.stringify({ found: false, error: 'invalid_birth', hint: `year ${V4_YEAR_MIN}-${V4_YEAR_MAX}, month 1-12, day 1-31, hour 0-11, gender male|female` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const result = await getV4Interpretation({ year, month, day, hour, gender });

  if (!result) {
    return new Response(
      JSON.stringify({ found: false, key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${hour}-${gender}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const dimensions = V4_DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    text: result.content[d.key] ?? '',
  }));

  return new Response(
    JSON.stringify({
      found: true,
      key: result.key,
      mingStar: result.mingStar,
      titles: result.titles,
      dimensions,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
