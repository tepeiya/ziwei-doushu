import { NextRequest, NextResponse } from 'next/server';
import { resolveIdentity, getTrialLimit } from '@/lib/billing/quota';
import { getTrialUsed } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 返回当前身份的会员/试用状态，供前端展示与付费墙判定。
export async function GET(req: NextRequest) {
  const { identity, setCookie } = await resolveIdentity(req);
  const used = await getTrialUsed(identity.id);
  const limit = await getTrialLimit();
  const remaining = identity.isMember ? null : Math.max(0, limit - used);
  const res = NextResponse.json({
    isMember: identity.isMember,
    isGuest: identity.isGuest,
    trialUsed: used,
    trialLimit: limit,
    trialRemaining: remaining,
  });
  if (setCookie) res.headers.set('Set-Cookie', setCookie);
  return res;
}
