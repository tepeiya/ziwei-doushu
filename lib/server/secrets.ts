/**
 * 生产密钥统一管理与校验
 * ─────────────────────────────────────────────────────────────
 * - 单一入口读取敏感配置，避免散落 process.env 各处。
 * - 启动时调用 validateSecrets()：生产环境发现缺失/弱密钥立即抛错，
 *   阻止带着占位密钥上线；开发态仅告警。
 * - 生成强密钥：openssl rand -base64 48
 */
import crypto from 'crypto';

// 已知开发占位值（命中即视为未配置）。含 .env.example 占位与历史本地占位。
const FORBIDDEN_PLACEHOLDERS = new Set([
  '',
  'changeme',
  'change-me',
  'secret',
  'development',
  'your-nextauth-secret-change-me',
  'ziwei-dev-secret-2026',
]);

export interface SecretSpec {
  name: string;
  requiredInProd: boolean; // 生产环境是否必填
  minLen?: number;
  forbidPlaceholder?: boolean;
}

export const SECRET_SPECS: SecretSpec[] = [
  { name: 'NEXTAUTH_SECRET', requiredInProd: true, minLen: 32, forbidPlaceholder: true },
  { name: 'NEXTAUTH_URL', requiredInProd: false },
  { name: 'DATABASE_URL', requiredInProd: false },
  { name: 'REDIS_URL', requiredInProd: false },
  { name: 'OPENAI_API_KEY', requiredInProd: false },
  { name: 'DEEPSEEK_API_KEY', requiredInProd: false },
  { name: 'WECHAT_MCH_ID', requiredInProd: false },
  { name: 'WECHAT_API_KEY', requiredInProd: false },
];

let _validated = false;

/** 生成符合规范的强随机密钥（base64，长度足够）。 */
export function generateSecret(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64');
}

/** 统一读取密钥。 */
export function getSecret(name: string): string | undefined {
  return process.env[name];
}

/**
 * 校验生产密钥。返回错误信息数组（空=通过）。
 * - 构建期（NEXT_PHASE=phase-production-build）跳过，避免打包阶段误报。
 * - 生产运行期：缺失必填项 / 命中占位 / 长度不足 → 返回错误。
 * - 开发期：同样检查，但仅告警，不阻断。
 */
export function checkSecrets(): string[] {
  if (process.env.NEXT_PHASE === 'phase-production-build') return [];
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  for (const spec of SECRET_SPECS) {
    const val = process.env[spec.name];
    if (!val) {
      if (isProd && spec.requiredInProd) {
        errors.push(`缺少必填生产密钥 ${spec.name}`);
      }
      continue;
    }
    if (spec.forbidPlaceholder && FORBIDDEN_PLACEHOLDERS.has(val.trim())) {
      errors.push(
        `${spec.name} 仍为开发占位值，生产必须使用强随机密钥（生成：openssl rand -base64 48）`,
      );
    }
    if (spec.minLen && val.length < spec.minLen) {
      errors.push(`${spec.name} 长度不足（需 >= ${spec.minLen} 字节）`);
    }
  }
  return errors;
}

/**
 * 执行校验。幂等。
 * 生产运行期校验失败 → 抛错（阻断启动）；
 * 开发期校验失败 → 仅告警。
 */
export function validateSecrets(): void {
  if (_validated) return;
  _validated = true;
  const errors = checkSecrets();
  if (!errors.length) return;
  const msg = `[secrets] 密钥校验未通过：\n - ${errors.join('\n - ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
  // 开发态：不阻断，但明确提示
  console.warn(`⚠️  ${msg}`);
}
