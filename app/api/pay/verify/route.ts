import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db';

export const runtime = 'nodejs';

// 前端轮询订单状态（支付成功后自动跳转）
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  return NextResponse.json({ status: order.status, amount: order.amount, plan: order.plan });
}
