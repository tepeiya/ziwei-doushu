import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdmin, adminError } from '@/lib/admin';
import { getSettings, setMembership, revokeMembership, setUserRole } from '@/lib/db';
import { planDurationDays } from '@/lib/billing';
import type { MembershipPlan } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 会员操作：
 * - action=grant|extend  按套餐授予/延长（days 可覆盖默认时长）
 * - action=revoke        立即撤销
 * - action=role          设置 / 取消管理员
 */
export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    action?: string;
    plan?: string;
    days?: number;
    role?: 'user' | 'admin';
  };

  if (!body.userId || !body.action) return adminError('缺少 userId 或 action', 400);

  if (body.action === 'revoke') {
    await revokeMembership(body.userId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'role') {
    if (body.role !== 'user' && body.role !== 'admin') return adminError('role 参数非法', 400);
    const u = await setUserRole(body.userId, body.role);
    if (!u) return adminError('用户不存在', 404);
    return NextResponse.json({ ok: true, user: { id: u.id, role: u.role } });
  }

  if (body.action === 'grant' || body.action === 'extend') {
    const plan: MembershipPlan = body.plan === 'yearly' ? 'yearly' : 'monthly';
    const settings = await getSettings();
    const days =
      typeof body.days === 'number' && body.days > 0
        ? Math.floor(body.days)
        : planDurationDays(plan, settings.plans ?? {});
    if (days <= 0) return adminError('套餐时长未配置', 400);
    const m = await setMembership(body.userId, plan, days);
    return NextResponse.json({ ok: true, membership: m });
  }

  return adminError('不支持的操作', 400);
}
