import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminError } from '@/lib/admin';
import { getOrder, listOrders, markOrderPaid } from '@/lib/db';
import { getPaymentConfig } from '@/lib/payment-config';
import { reconcileOrder } from '@/lib/server/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 订单列表（最近 200 条）。 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const orders = await listOrders(200);
  return NextResponse.json({ orders });
}

/**
 * 订单对账操作（人工客服入口）：
 *   { orderId }        → 立即向网关查单，确认已付款且金额一致才补入账
 *   { orderId, force } → 强制入账（线下转账 / 网关查不到但已核实收款），留审计日志
 */
export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  let orderId: string | undefined;
  let force = false;
  try {
    ({ orderId, force } = await req.json());
  } catch {
    return adminError('请求错误', 400);
  }
  if (!orderId) return adminError('缺少订单号', 400);
  const order = await getOrder(orderId);
  if (!order) return adminError('订单不存在', 404);
  if (order.status === 'paid') return NextResponse.json({ ok: true, alreadyPaid: true, order });

  if (force) {
    console.warn('[admin:orders] 管理员强制入账', {
      admin: admin.identifier,
      orderId,
      plan: order.plan,
      amount: order.amount,
      prevStatus: order.status,
    });
    const updated = await markOrderPaid(orderId, order.channel ?? 'manual');
    return NextResponse.json({ ok: true, order: updated });
  }

  const settled = await reconcileOrder(order, await getPaymentConfig(), true);
  return NextResponse.json({ ok: settled.status === 'paid', order: settled });
}