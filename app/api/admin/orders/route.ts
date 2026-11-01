import { NextResponse } from 'next/server';
import { getAdmin, adminError } from '@/lib/admin';
import { listOrders } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 订单列表（最近 200 条）。 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const orders = await listOrders(200);
  return NextResponse.json({ orders });
}
