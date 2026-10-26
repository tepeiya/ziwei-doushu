import assert from 'node:assert/strict';

// 环境变量集中校验：生产缺密钥应 fail-fast，开发态应放行
(async () => {
  // 先以「生产 + 缺 NEXTAUTH_SECRET」验证抛错（必须是首次调用，避免命中缓存）
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
  delete process.env.NEXTAUTH_SECRET;
  const prod = await import('../../lib/env');
  assert.throws(() => prod.validateEnv(), /校验失败/, '生产缺密钥应抛错');

  // 再切回开发态 + 补齐密钥，验证放行
  (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  process.env.NEXTAUTH_SECRET = 'x'.repeat(40);
  const env = prod.validateEnv();
  assert.ok(['development', 'production', 'test'].includes(env.NODE_ENV));
  const summary = prod.safeEnvSummary();
  assert.ok(typeof summary.NEXTAUTH_SECRET === 'string');

  console.log('env validation tests passed');
})();
