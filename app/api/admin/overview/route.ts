import { NextResponse } from 'next/server';
import { getAdmin, adminError } from '@/lib/admin';
import { listUsers, listOrders, getSettings, getMembership } from '@/lib/db';
import { getTrialLimit } from '@/lib/billing/quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 后台概览：用户数、有效会员数、订单与收入、当前试用额度。 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const [users, orders, settings, trialLimit] = await Promise.all([
    listUsers(),
    listOrders(500),
    getSettings(),
    getTrialLimit(),
  ]);

  const now = Date.now();
  const memberships = await Promise.all(users.map((u) => getMembership(u.id)));
  const activeMembers = memberships.filter((m) => m.status === 'active' && m.expiresAt > now).length;
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const revenueFen = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return NextResponse.json({
    users: users.length,
    activeMembers,
    orders: orders.length,
    paidOrders: paidOrders.length,
    revenueFen,
    trialLimit,
    settingsUpdatedAt: settings.updatedAt ?? null,
    admin: { id: admin.id, identifier: admin.identifier, via: admin.via },
  });
}
