import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOrder } from '@/lib/db';
import { getPlan } from '@/lib/billing';
import { cacheSet } from '@/lib/server/cache';
import { createPayment, getConfiguredChannel } from '@/lib/server/payments';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: '未登录' }, { status: 401 });

  let planId: string;
  try {
    ({ planId } = await req.json());
  } catch {
    return NextResponse.json({ error: '请求错误' }, { status: 400 });
  }
  const plan = getPlan(planId);
  if (!plan) return NextResponse.json({ error: '套餐不存在' }, { status: 404 });

  const channel = getConfiguredChannel();

  // 未配置真实商户号 → 沙箱模拟支付
  if (!channel) {
    const order = await createOrder({ userId: uid, plan: plan.id, amount: plan.priceFen, channel: 'sandbox' });
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      payUrl: `/pay/${order.id}`,
      sandbox: true,
    });
  }

  // 已配置真实渠道 → 调用网关下单
  const order = await createOrder({ userId: uid, plan: plan.id, amount: plan.priceFen, channel });
  const siteUrl = process.env.PAY_NOTIFY_BASE_URL || process.env.NEXTAUTH_URL || '';
  const notifyUrl = `${siteUrl}/api/pay/notify`;
  const returnUrl = `${siteUrl}/pay/${order.id}`;

  const result = await createPayment({
    orderId: order.id,
    amountFen: order.amount,
    subject: `紫微命盘-${plan.name}`,
    channel,
    clientIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
    returnUrl,
    notifyUrl,
  });

  if (!result) {
    return NextResponse.json({ error: '支付网关下单失败，请稍后重试' }, { status: 502 });
  }

  // 微信 Native 需把 code_url 交给前端转二维码；支付宝直接给跳转地址
  let payUrl = `/pay/${order.id}`;
  if (result.gateway === 'alipay' && result.redirectUrl) {
    payUrl = result.redirectUrl;
    await cacheSet(`pay:redirect:${order.id}`, result.redirectUrl, 30 * 60 * 1000);
  }
  if (result.gateway === 'wechat' && result.codeUrl) {
    await cacheSet(`pay:wx:${order.id}`, result.codeUrl, 30 * 60 * 1000);
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    amount: order.amount,
    payUrl,
    gateway: result.gateway,
    sandbox: false,
  });
}
