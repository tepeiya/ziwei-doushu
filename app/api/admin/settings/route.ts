import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdmin, adminError } from '@/lib/admin';
import {
  getSettings,
  updateSettings,
  type Settings,
  type PaymentSettings,
} from '@/lib/db';
import { mergePlans, PLANS } from '@/lib/billing';
import { invalidateTrialLimitCache } from '@/lib/billing/quota';
import { getPaymentConfig, resolveChannel, maskSecret } from '@/lib/payment-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 读取后台设置 + 当前生效套餐。 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const settings = await getSettings();
  const cfg = await getPaymentConfig();

  return NextResponse.json({
    settings,
    plans: mergePlans(settings.plans ?? {}),
    defaults: Object.values(PLANS),
    // 支付配置：敏感字段一律脱敏，只暴露「是否已配置」
    payment: {
      channel: cfg.channel,
      effectiveChannel: resolveChannel(cfg) ?? 'sandbox',
      customised: !!(settings.payment && Object.keys(settings.payment).length > 0),
      wechat: {
        appId: maskSecret(cfg.wechatAppId),
        mchId: maskSecret(cfg.wechatMchId),
        apiKey: maskSecret(cfg.wechatApiKey),
        configured: !!(cfg.wechatAppId && cfg.wechatMchId && cfg.wechatApiKey),
      },
      alipay: {
        appId: maskSecret(cfg.alipayAppId),
        privateKey: maskSecret(cfg.alipayPrivateKey),
        publicKey: maskSecret(cfg.alipayPublicKey),
        configured: !!(cfg.alipayAppId && cfg.alipayPrivateKey && cfg.alipayPublicKey),
      },
    },
  });
}

/** 保存后台设置（试用次数 / 套餐覆盖）。 */
export async function PUT(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return adminError('未登录或非管理员', 401);

  const body = (await req.json().catch(() => ({}))) as Partial<Settings>;

  const patch: Partial<Settings> = {};
  if (typeof body.trialUses === 'number' && Number.isFinite(body.trialUses) && body.trialUses >= 0) {
    patch.trialUses = Math.floor(body.trialUses);
  }
  if (body.plans && typeof body.plans === 'object') {
    // 仅接受白名单字段，避免写入任意内容
    const plans: Settings['plans'] = {};
    for (const [id, v] of Object.entries(body.plans)) {
      if (!(id in PLANS) || !v) continue;
      plans[id] = {
        ...(typeof v.name === 'string' ? { name: v.name } : {}),
        ...(typeof v.priceFen === 'number' && v.priceFen >= 0 ? { priceFen: Math.floor(v.priceFen) } : {}),
        ...(typeof v.durationDays === 'number' && v.durationDays > 0 ? { durationDays: Math.floor(v.durationDays) } : {}),
        ...(typeof v.enabled === 'boolean' ? { enabled: v.enabled } : {}),
      };
    }
    patch.plans = plans;
  }

  // 支付配置：敏感字段「非空且非脱敏占位」才覆盖，避免误清空已保存的密钥
  if (body.payment && typeof body.payment === 'object') {
    const p = body.payment as Record<string, unknown>;
    const cur = (await getSettings()).payment ?? {};
    const nextP: PaymentSettings = { ...cur };

    const ch = p.channel;
    if (ch === 'auto' || ch === 'sandbox' || ch === 'wechat' || ch === 'alipay') {
      nextP.channel = ch;
    }
    const secretKeys = [
      'wechatAppId',
      'wechatMchId',
      'wechatApiKey',
      'alipayAppId',
      'alipayPrivateKey',
      'alipayPublicKey',
    ] as const;
    for (const k of secretKeys) {
      const v = p[k];
      if (typeof v === 'string' && v.trim() !== '' && !v.includes('••')) {
        nextP[k] = v.trim();
      }
    }
    patch.payment = nextP;
  }

  const next = await updateSettings(patch);
  invalidateTrialLimitCache(); // 让新的试用额度立即生效

  const cfg = await getPaymentConfig();
  return NextResponse.json({
    ok: true,
    settings: next,
    plans: mergePlans(next.plans ?? {}),
    payment: {
      channel: cfg.channel,
      effectiveChannel: resolveChannel(cfg) ?? 'sandbox',
      customised: !!(next.payment && Object.keys(next.payment).length > 0),
      wechat: {
        appId: maskSecret(cfg.wechatAppId),
        mchId: maskSecret(cfg.wechatMchId),
        apiKey: maskSecret(cfg.wechatApiKey),
        configured: !!(cfg.wechatAppId && cfg.wechatMchId && cfg.wechatApiKey),
      },
      alipay: {
        appId: maskSecret(cfg.alipayAppId),
        privateKey: maskSecret(cfg.alipayPrivateKey),
        publicKey: maskSecret(cfg.alipayPublicKey),
        configured: !!(cfg.alipayAppId && cfg.alipayPrivateKey && cfg.alipayPublicKey),
      },
    },
  });
}
