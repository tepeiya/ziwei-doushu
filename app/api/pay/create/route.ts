import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOrder } from '@/lib/db';
import { getPlan } from '@/lib/billing';

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

  const order = await createOrder({ userId: uid, plan: plan.id, amount: plan.priceFen });

  // ─── 生产接入点 ─────────────────────────────────────────────
  // 若配置了微信/支付宝商户号，此处应：
  //   1) 调用统一下单接口获取 prepay_id / 支付链接
  //   2) 返回 payUrl 或二维码字符串供前端拉起支付
  // 当前为沙箱环境，直接返回本地模拟支付页。
  const useRealChannel =
    !!process.env.WECHAT_MCH_ID || !!process.env.ALIPAY_APP_ID;
  const payUrl = useRealChannel
    ? `/api/pay/gateway/${order.id}` // TODO: 真实支付网关
    : `/pay/${order.id}`;

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    amount: order.amount,
    payUrl,
    sandbox: !useRealChannel,
  });
}
