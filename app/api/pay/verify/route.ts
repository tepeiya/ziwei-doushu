import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db';
import { cacheGet } from '@/lib/server/cache';

export const runtime = 'nodejs';

// 前端轮询订单状态（支付成功后自动跳转）；真实渠道时一并返回网关信息
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });

  let gateway: string | null = order.channel && order.channel !== 'sandbox' ? order.channel : null;
  let codeUrl: string | undefined;
  let payUrl: string | undefined;
  if (order.channel === 'wechat') {
    codeUrl = (await cacheGet(`pay:wx:${id}`)) ?? undefined;
  } else if (order.channel === 'alipay') {
    payUrl = (await cacheGet(`pay:redirect:${id}`)) ?? undefined;
  }

  return NextResponse.json({
    status: order.status,
    amount: order.amount,
    plan: order.plan,
    gateway,
    codeUrl,
    payUrl,
  });
}
