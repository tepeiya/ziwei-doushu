import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db';
import { cacheGet } from '@/lib/server/cache';
import { reconcileOrder } from '@/lib/server/reconcile';

export const runtime = 'nodejs';

// 前端轮询订单状态（支付成功后自动跳转）；真实渠道时一并返回网关信息。
// 轮询同时触发对账：回调丢失也能靠主动查单补入账，超时未付则关单。
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
  const found = await getOrder(id);
  if (!found) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  const order = await reconcileOrder(found);

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
