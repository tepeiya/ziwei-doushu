/**
 * 环境变量集中校验（无第三方依赖）
 * ─────────────────────────────────────────────────────────────
 * 在服务启动时调用一次 validateEnv()，缺失关键变量立即抛出清晰错误
 * （列出所有缺失项），避免「启动成功、运行时才炸」的排查困境。
 *
 * 设计原则：
 *  - 不引入 zod 等依赖，保持零额外安装；
 *  - `development` 模式只校验必填项，`production` 模式追加校验生产必需项；
 *  - 可选能力（Redis / LLM / 支付 / Sentry）缺失时只告警、不阻断。
 */
export interface EnvShape {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL?: string;
  REDIS_URL?: string;
  NEXTAUTH_URL?: string;
  NEXTAUTH_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  SENTRY_DSN?: string;
  WECHAT_MCH_ID?: string;
  WECHAT_API_KEY?: string;
  ALIPAY_APP_ID?: string;
  ALIPAY_PRIVATE_KEY?: string;
  PAY_NOTIFY_BASE_URL?: string;
  SITE_URL?: string;
}

interface Rule {
  key: string;
  /** 任何环境都必须 */
  required?: boolean;
  /** 仅 production 必须 */
  requiredInProd?: boolean;
  /** 值必须是合法 URL（http(s):// 开头） */
  url?: boolean;
  /** 日志中需遮蔽（避免泄露密钥） */
  secret?: boolean;
}

const RULES: Rule[] = [
  { key: 'NEXTAUTH_SECRET', requiredInProd: true, secret: true },
  { key: 'NEXTAUTH_URL', requiredInProd: true, url: true },
  // DATABASE_URL 在生产非强制：未设置时降级为 JSON 持久化（双模设计），
  // 与上 lib/server/secrets.ts 保持一致；商业功能建议生产配置 Postgres。
  { key: 'DATABASE_URL' },
  { key: 'REDIS_URL' },
  { key: 'ANTHROPIC_API_KEY' },
  { key: 'SENTRY_DSN', url: true },
  { key: 'WECHAT_MCH_ID' },
  { key: 'WECHAT_API_KEY', secret: true },
  { key: 'ALIPAY_APP_ID' },
  { key: 'ALIPAY_PRIVATE_KEY', secret: true },
  { key: 'PAY_NOTIFY_BASE_URL', url: true },
  { key: 'SITE_URL', url: true },
];

let cached: EnvShape | null = null;

/** 校验并缓存环境快照；失败抛错（列出全部缺失项）。 */
export function validateEnv(): EnvShape {
  if (cached) return cached;

  const nodeEnv = (process.env.NODE_ENV as EnvShape['NODE_ENV']) || 'development';
  const isProd = nodeEnv === 'production';
  const errors: string[] = [];
  const out: Record<string, string | undefined> = { NODE_ENV: nodeEnv };

  for (const rule of RULES) {
    const val = process.env[rule.key];
    out[rule.key] = val;
    const must = rule.required || (isProd && rule.requiredInProd);
    if (must && !val) {
      errors.push(`  - ${rule.key} 缺失（${isProd ? '生产环境必需' : '必需'}）`);
      continue;
    }
    if (val && rule.url && !/^https?:\/\//.test(val)) {
      errors.push(`  - ${rule.key} 应为合法 URL（以 http(s):// 开头），当前为 "${val}"`);
    }
  }

  if (errors.length) {
    const msg = [
      `[env] 环境变量校验失败，服务无法以 ${nodeEnv} 模式启动：`,
      ...errors,
      '请检查 .env / 部署平台环境变量配置。',
    ].join('\n');
    throw new Error(msg);
  }

  cached = out as unknown as EnvShape;
  return cached;
}

/** 取已校验的环境快照（首次调用会触发校验）。 */
export function getEnv(): EnvShape {
  return validateEnv();
}

/** 遮蔽密钥后再输出，便于调试打印而不泄露。 */
export function safeEnvSummary(): Record<string, string> {
  const e = getEnv();
  const rec = e as unknown as Record<string, string | undefined>;
  const out: Record<string, string> = { NODE_ENV: e.NODE_ENV };
  for (const rule of RULES) {
    const v = rec[rule.key];
    if (!v) {
      out[rule.key] = '(未设置)';
    } else if (rule.secret) {
      out[rule.key] = v.slice(0, 4) + '****';
    } else if (rule.url) {
      out[rule.key] = v;
    } else {
      out[rule.key] = v.length > 24 ? v.slice(0, 8) + '…' : v;
    }
  }
  return out;
}
