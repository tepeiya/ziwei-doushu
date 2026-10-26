import { NextRequest, NextResponse } from 'next/server';
import { getOrder, markOrderPaid } from '@/lib/db';
import { verifyCallback } from '@/lib/server/payments';
import type { Gateway } from '@/lib/server/payments';

export const runtime = 'nodejs';

/**
 * 支付回调 / 模拟支付确认
 * ────────────────────────────────────────────────────────────
 * 1) 沙箱：前端「模拟支付」POST JSON { orderId }，直接标记已支付；
 * 2) 微信：POST text/xml 异步通知，验签（WECHAT_API_KEY）后 markOrderPaid，回 SUCCESS；
 * 3) 支付宝：POST 表单异步通知，验签（ALIPAY_PUBLIC_KEY）后 markOrderPaid，回 success。
 * 未配置对应商户密钥时，真实回调一律拒绝（返回失败），避免伪造通知入账。
 */
export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';

  // ── 沙箱 JSON ──
  if (ct.includes('application/json')) {
    let orderId: string | undefined;
    try {
      ({ orderId } = await req.json());
    } catch {
      return NextResponse.json({ error: '请求错误' }, { status: 400 });
    }
    if (!orderId) return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    if (order.status === 'paid') return NextResponse.json({ ok: true, alreadyPaid: true });
    await markOrderPaid(orderId, 'sandbox');
    return NextResponse.json({ ok: true });
  }

  // ── 微信 XML 通知 ──
  if (ct.includes('xml')) {
    const xml = await req.text();
    const { ok, orderId } = verifyCallback('wechat', { xml });
    if (!ok || !orderId) {
      return new Response('<xml><return_code>FAIL</return_code></xml>', { status: 400 });
    }
    const order = await getOrder(orderId);
    if (order && order.status !== 'paid') await markOrderPaid(orderId, 'wechat');
    return new Response('<xml><return_code>SUCCESS</return_code><return_msg>OK</return_msg></xml>', {
      status: 200,
    });
  }

  // ── 支付宝表单通知 ──
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    params[k] = String(v);
  });
  const outTradeNo = params.out_trade_no;
  const channel: Gateway = 'alipay';
  const { ok } = verifyCallback(channel, { params });
  if (!ok || !outTradeNo) return new Response('failure', { status: 400 });
  const order = await getOrder(outTradeNo);
  if (order && order.status !== 'paid') await markOrderPaid(outTradeNo, 'alipay');
  return new Response('success', { status: 200 });
}
