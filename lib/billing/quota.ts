/**
 * 配额 / 试用次数控制（硬付费墙核心逻辑）
 * ─────────────────────────────────────────────────────────────
 * - 会员（membership 有效）：无限次 AI 解读。
 * - 非会员：每位身份（登录用户 id 或游客 guest cookie）拥有 TRIAL_USES 次免费试用。
 *   试用次数用尽后，/api/interpret 返回 402，前端弹出付费墙。
 * - TRIAL_USES 可在 .env 中配置（默认 3），即“试用次数设置”。
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMember, getTrialUsed, getSettings } from '@/lib/db';

// 试用次数优先级：后台设置 > 环境变量 TRIAL_USES > 默认 3。
// 后台设置需读库，故改为异步（调用方均为 async 路由）。
// 加 5 秒缓存：解读是高频接口，避免每次请求都读库。
let cachedTrialLimit: { value: number; at: number } | null = null;
const TRIAL_LIMIT_CACHE_MS = 5_000;

function fallbackTrialLimit(): number {
  const raw = process.env.TRIAL_USES;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

export async function getTrialLimit(): Promise<number> {
  if (cachedTrialLimit && Date.now() - cachedTrialLimit.at < TRIAL_LIMIT_CACHE_MS) {
    return cachedTrialLimit.value;
  }
  let value = fallbackTrialLimit();
  try {
    const s = await getSettings();
    const fromDb = Number(s?.trialUses);
    if (Number.isFinite(fromDb) && fromDb >= 0) value = fromDb;
  } catch {
    /* 读取失败则用环境变量/默认值 */
  }
  cachedTrialLimit = { value, at: Date.now() };
  return value;
}

/** 后台保存设置后调用，让新额度立即生效（清掉 5 秒缓存）。 */
export function invalidateTrialLimitCache(): void {
  cachedTrialLimit = null;
}

export const GUEST_COOKIE = 'ziwei_guest';

export interface Identity {
  id: string;
  isGuest: boolean;
  isMember: boolean;
}

/**
 * 解析请求身份：
 * - 已登录 → 用 userId，并查询会员状态。
 * - 未登录 → 用 guest cookie；若无则生成并下发 Set-Cookie。
 */
export async function resolveIdentity(
  req: NextRequest,
): Promise<{ identity: Identity; setCookie?: string }> {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;

  if (uid) {
    const member = await isMember(uid);
    return { identity: { id: uid, isGuest: false, isMember: member } };
  }

  let guest = req.cookies.get(GUEST_COOKIE)?.value;
  let setCookie: string | undefined;
  if (!guest) {
    guest = 'g_' + crypto.randomUUID();
    setCookie = `${GUEST_COOKIE}=${guest}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }
  return { identity: { id: guest, isGuest: true, isMember: false }, setCookie };
}

export interface QuotaResult {
  ok: boolean;
  reason?: string;
}

/** 检查当前身份是否还有解读额度（会员始终放行）。 */
export async function checkQuota(identity: Identity): Promise<QuotaResult> {
  if (identity.isMember) return { ok: true };
  const used = await getTrialUsed(identity.id);
  const limit = await getTrialLimit();
  if (used < limit) return { ok: true };
  return {
    ok: false,
    reason: `免费试用次数已用完（共 ${limit} 次），开通会员即可无限次 AI 解读`,
  };
}
