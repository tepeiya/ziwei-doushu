/**
 * 支付配置
 * ─────────────────────────────────────────────────────────────
 * 生效优先级：后台设置（DB settings.payment）> 环境变量。
 * 后台留空的字段自动沿用环境变量，便于「环境变量兜底 + 后台覆盖」。
 *
 * 敏感字段（商户密钥 / 应用私钥 / 公钥）在返回给界面时一律脱敏，
 * 后台保存时「非空才覆盖」，避免误清空。
 */
import { getSettings, type PaymentSettings } from '@/lib/db';

export type PaymentChannel = 'auto' | 'sandbox' | 'wechat' | 'alipay';

export interface PaymentConfig {
  channel: PaymentChannel;
  wechatAppId: string;
  wechatMchId: string;
  wechatApiKey: string;
  alipayAppId: string;
  alipayPrivateKey: string;
  alipayPublicKey: string;
}

/** 仅从环境变量构造（同步，供默认参数与非 async 场景使用）。 */
export function paymentConfigFromEnv(): PaymentConfig {
  return {
    channel: 'auto',
    wechatAppId: process.env.WECHAT_APP_ID ?? '',
    wechatMchId: process.env.WECHAT_MCH_ID ?? '',
    wechatApiKey: process.env.WECHAT_API_KEY ?? '',
    alipayAppId: process.env.ALIPAY_APP_ID ?? '',
    alipayPrivateKey: process.env.ALIPAY_PRIVATE_KEY ?? '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY ?? '',
  };
}

const pick = (dbVal: string | undefined, envVal: string): string =>
  typeof dbVal === 'string' && dbVal !== '' ? dbVal : envVal;

/** 合并后台设置与环境变量，得到生效配置。 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const env = paymentConfigFromEnv();
  let db: PaymentSettings = {};
  try {
    const s = await getSettings();
    db = s.payment ?? {};
  } catch {
    /* 读库失败则纯用环境变量 */
  }
  return {
    channel: db.channel ?? env.channel,
    wechatAppId: pick(db.wechatAppId, env.wechatAppId),
    wechatMchId: pick(db.wechatMchId, env.wechatMchId),
    wechatApiKey: pick(db.wechatApiKey, env.wechatApiKey),
    alipayAppId: pick(db.alipayAppId, env.alipayAppId),
    alipayPrivateKey: pick(db.alipayPrivateKey, env.alipayPrivateKey),
    alipayPublicKey: pick(db.alipayPublicKey, env.alipayPublicKey),
  };
}

/** 决定实际使用哪个渠道；返回 null 表示回退沙箱模拟支付。 */
export function resolveChannel(cfg: PaymentConfig): 'wechat' | 'alipay' | null {
  if (cfg.channel === 'sandbox') return null;
  const wechatReady = !!(cfg.wechatAppId && cfg.wechatMchId && cfg.wechatApiKey);
  const alipayReady = !!(cfg.alipayAppId && cfg.alipayPrivateKey && cfg.alipayPublicKey);
  if (cfg.channel === 'wechat') return wechatReady ? 'wechat' : null;
  if (cfg.channel === 'alipay') return alipayReady ? 'alipay' : null;
  // auto：沿用旧行为，微信优先，其次支付宝
  if (wechatReady) return 'wechat';
  if (alipayReady) return 'alipay';
  return null;
}

/** 敏感信息脱敏：只留末 4 位，用于后台展示「已配置」状态。 */
export function maskSecret(v?: string): string {
  if (!v) return '';
  const tail = v.slice(-4);
  return v.length <= 4 ? '••••' : `••••••••${tail}`;
}
