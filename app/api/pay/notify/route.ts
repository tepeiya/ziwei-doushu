import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getOrder, markOrderPaid } from '@/lib/db';
import { verifyCallback, isPaidTradeState } from '@/lib/server/payments';
import type { Gateway } from '@/lib/server/payments';
import { getPaymentConfig, resolveChannel } from '@/lib/payment-config';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * 支付回调 / 模拟支付确认
 * ────────────────────────────────────────────────────────────
 * 1) 沙箱：前端「模拟支付」POST JSON { orderId }，需登录且本人订单；
 * 2) 微信：POST text/xml 异步通知，验签（WECHAT_API_KEY）+ 商户身份核对；
 * 3) 支付宝：POST 表单异步通知，验签（ALIPAY_PUBLIC_KEY）+ app_id 核对。
 * 入账前三道校验：验签通过 → trade_state/trade_status 为支付成功 → 回调金额等于订单金额。
 * 未配置对应商户密钥时，真实回调一律拒绝（返回失败），避免伪造通知入账。
 */
export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  // 生效支付配置（后台设置 > 环境变量）
  const cfg = await getPaymentConfig();

  // ── 沙箱 JSON（仅用于前端「模拟支付」按钮）──
  // 加固：此前任何 POST {orderId} 都能直接入账（可拿任意 orderId 免费激活会员）。
  // 现在：配置了真实商户密钥（微信/支付宝）时沙箱分支整体关闭；
  // 未配置时也必须登录且本人订单才能模拟支付。
  if (ct.includes('application/json')) {
    const gateway = resolveChannel(cfg);
    if (gateway) {
      return NextResponse.json({ error: '沙箱支付已关闭（已配置真实支付网关）' }, { status: 403 });
    }
    const uid = ((await getServerSession(authOptions))?.user as { id?: string } | undefined)?.id;
    if (!uid) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    let orderId: string | undefined;
    try {
      ({ orderId } = await req.json());
    } catch {
      return NextResponse.json({ error: '请求错误' }, { status: 400 });
    }
    if (!orderId) return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    if (order.userId !== uid) {
      return NextResponse.json({ error: '无权操作该订单' }, { status: 403 });
    }
    if (order.status === 'paid') return NextResponse.json({ ok: true, alreadyPaid: true });
    // 已超时关单不得再模拟支付（真实网关的迟到回调另有钱的实据，走下面分支）
    if (order.status === 'closed') {
      return NextResponse.json({ error: '订单已超时关闭，请重新下单' }, { status: 409 });
    }
    await markOrderPaid(orderId, 'sandbox');
    return NextResponse.json({ ok: true });
  }

  // ── 微信 XML 通知 ──
  if (ct.includes('xml')) {
    const ack = (paid: boolean) =>
      paid
        ? new Response('<xml><return_code>SUCCESS</return_code><return_msg>OK</return_msg></xml>', {
            status: 200,
          })
        : new Response('<xml><return_code>FAIL</return_code></xml>', { status: 400 });
    const xml = await req.text();
    const r = verifyCallback('wechat', { xml }, cfg);
    if (!r.ok || !r.orderId) return ack(false);
    // 非支付成功的状态通知（退款/关闭）：确认收到但绝不入账，避免网关无限重试
    if (!isPaidTradeState(r.tradeState)) return ack(true);
    const order = await getOrder(r.orderId);
    if (!order) return ack(false);
    if (r.amountFen !== order.amount) {
      console.warn('[pay:notify] 微信回调金额与订单不符，拒绝入账', {
        orderId: r.orderId,
        callback: r.amountFen,
        order: order.amount,
      });
      return ack(false);
    }
    if (order.status !== 'paid') await markOrderPaid(r.orderId, 'wechat');
    return ack(true);
  }

  // ── 支付宝表单通知 ──
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    params[k] = String(v);
  });
  const outTradeNo = params.out_trade_no;
  const channel: Gateway = 'alipay';
  const ack = (paid: boolean) =>
    new Response(paid ? 'success' : 'failure', { status: paid ? 200 : 400 });
  const r = verifyCallback(channel, { params }, cfg);
  if (!r.ok || !outTradeNo) return ack(false);
  // WAIT_BUYER_PAY 等过程状态同样会发通知，未付款不得入账
  if (!isPaidTradeState(r.tradeState)) return ack(true);
  const order = await getOrder(outTradeNo);
  if (!order) return ack(false);
  if (r.amountFen !== order.amount) {
    console.warn('[pay:notify] 支付宝回调金额与订单不符，拒绝入账', {
      orderId: outTradeNo,
      callback: r.amountFen,
      order: order.amount,
    });
    return ack(false);
  }
  if (order.status !== 'paid') await markOrderPaid(outTradeNo, 'alipay');
  return ack(true);
}
