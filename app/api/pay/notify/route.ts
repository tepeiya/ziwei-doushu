import { NextRequest, NextResponse } from 'next/server';
import { getOrder, markOrderPaid } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 支付回调 / 模拟支付确认
 * ────────────────────────────────────────────────────────────
 * 沙箱模式：前端「模拟支付」按钮直接 POST 此端点，标记订单为已支付。
 * 生产模式：微信/支付宝异步回调应验签后调用 markOrderPaid。
 */
export async function POST(req: NextRequest) {
  let orderId: string | undefined;
  try {
    ({ orderId } = await req.json());
  } catch {
    return NextResponse.json({ error: '请求错误' }, { status: 400 });
  }
  if (!orderId) return NextResponse.json({ error: '缺少订单号' }, { status: 400 });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  if (order.status === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  // 生产环境在此插入验签逻辑，例如：
  //   const ok = verifyWechatSign(req); if (!ok) return 401;
  await markOrderPaid(orderId, 'sandbox');
  return NextResponse.json({ ok: true });
}
