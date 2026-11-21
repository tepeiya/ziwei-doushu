import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { mergePlans, PLANS } from '@/lib/billing';
import { getPaymentConfig, resolveChannel } from '@/lib/payment-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 对外生效的套餐列表（默认套餐 + 后台覆盖）与生效支付渠道。
 * channel 为 null 表示沙箱模拟支付；与 /api/pay/create 用的是同一套判定。
 */
export async function GET() {
  const channel = resolveChannel(await getPaymentConfig());
  try {
    const s = await getSettings();
    return NextResponse.json({ plans: mergePlans(s.plans ?? {}), channel });
  } catch {
    return NextResponse.json({ plans: Object.values(PLANS), channel });
  }
}
