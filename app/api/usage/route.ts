import { NextRequest, NextResponse } from 'next/server';
import { resolveIdentity, getTrialLimit } from '@/lib/billing/quota';
import { getTrialUsed, getBonusUses } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 返回当前身份的会员/试用状态，供前端展示与付费墙判定。
export async function GET(req: NextRequest) {
  const { identity, setCookie } = await resolveIdentity(req);
  const [used, bonus, limit] = await Promise.all([
    getTrialUsed(identity.id),
    getBonusUses(identity.id),
    getTrialLimit(),
  ]);
  // 付费赠送次数叠加在免费额度之上，前端只需看 remaining
  const remaining = identity.isMember ? null : Math.max(0, limit + bonus - used);
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
