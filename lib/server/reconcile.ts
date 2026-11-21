/**
 * 支付对账：主动查单补偿 + 超时关单
 * ─────────────────────────────────────────────────────────────
 * 异步回调可能丢失（网络抖动、站点重启、网关重试耗尽），只靠 notify 会出现
 * 「用户已付款但订单一直 pending」。这里在订单被查询时向网关主动核对一次：
 *   - 网关确认已付款且金额一致 → 补入账（复用 markOrderPaid，权益交付与回调同一条路径）
 *   - 金额不一致 → 拒绝入账并告警（与回调同一道防线）
 *   - 查不准（网络失败 / 验签不过）→ 保持 pending，绝不臆断
 *   - 确认未付款且超过 ORDER_TTL_MS → 关单
 * 沙箱订单无网关可查，只做超时关单。
 */
import { closeOrder, markOrderPaid, type Order } from '@/lib/db';
import { queryPayment, type Gateway } from '@/lib/server/payments';
import { getPaymentConfig, type PaymentConfig } from '@/lib/payment-config';
import { cacheGet, cacheSet } from '@/lib/server/cache';

/** 待支付订单有效期：超过即关单，避免长期挂着可被后续回调激活的僵尸单。 */
export const ORDER_TTL_MS = 30 * 60 * 1000;

// 前端每 3 秒轮询一次，查单节流到 10 秒一次，避免打爆网关接口频次。
// 后台手动查单传 immediate=true 跳过节流。
const QUERY_THROTTLE_MS = 10_000;

export async function reconcileOrder(
  order: Order,
  cfg?: PaymentConfig,
  immediate = false,
): Promise<Order> {
  if (order.status !== 'pending') return order;
  const expired = Date.now() - order.createdAt > ORDER_TTL_MS;

  const channel: Gateway | null =
    order.channel === 'wechat' || order.channel === 'alipay' ? order.channel : null;
  if (!channel) {
    if (expired) return (await closeOrder(order.id)) ?? order;
    return order;
  }

  const throttleKey = `pay:query:${order.id}`;
  if (!immediate && (await cacheGet(throttleKey))) return order;
  await cacheSet(throttleKey, '1', QUERY_THROTTLE_MS);

  const q = await queryPayment(order.id, channel, cfg ?? (await getPaymentConfig()));
  if (!q.ok) return order;
  if (q.paid) {
    if (q.amountFen !== order.amount) {
      console.warn('[pay:reconcile] 查单金额与订单不符，拒绝入账', {
        orderId: order.id,
        gateway: q.amountFen,
        order: order.amount,
      });
      return order;
    }
    return (await markOrderPaid(order.id, channel)) ?? order;
  }
  if (expired) return (await closeOrder(order.id)) ?? order;
  return order;
}