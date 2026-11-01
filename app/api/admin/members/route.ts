import { NextResponse } from 'next/server';
import { getAdmin, adminError } from '@/lib/admin';
import { listUsers, getMembership, getTrialUsed } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 会员列表：用户 + 会员状态 + 试用消耗。 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const users = await listUsers();
  const now = Date.now();

  const members = await Promise.all(
    users.map(async (u) => {
      const m = await getMembership(u.id);
      const used = await getTrialUsed(u.id);
      return {
        id: u.id,
        identifier: u.identifier,
        nickname: u.nickname ?? '',
        role: u.role ?? 'user',
        createdAt: u.createdAt,
        plan: m.plan,
        status: m.status,
        expiresAt: m.expiresAt,
        isActive: m.status === 'active' && m.expiresAt > now,
        trialUsed: used,
      };
    }),
  );

  return NextResponse.json({ members });
}
