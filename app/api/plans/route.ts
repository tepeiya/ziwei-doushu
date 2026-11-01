import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { mergePlans, PLANS } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 对外生效的套餐列表（默认套餐 + 后台覆盖）。失败时回退默认。 */
export async function GET() {
  try {
    const s = await getSettings();
    return NextResponse.json({ plans: mergePlans(s.plans ?? {}) });
  } catch {
    return NextResponse.json({ plans: Object.values(PLANS) });
  }
}
