/**
 * Next.js 启动钩子（instrumentation）
 * ─────────────────────────────────────────────────────────────
 * 服务端进程启动时执行一次（仅 nodejs runtime，Edge 跳过）：
 *  1) validateSecrets()  —— 密钥校验（缺失/弱密钥在生产即 fail-fast，来自 lib/server/secrets）；
 *  2) validateEnv()      —— 环境变量集中校验（URL 格式、可选能力键，来自 lib/env）；
 *  3) registerGlobalErrorHandlers() —— 挂载进程级错误捕获与结构化日志。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateSecrets } = await import('./lib/server/secrets');
  validateSecrets();

  const { validateEnv } = await import('./lib/env');
  validateEnv();

  const { registerGlobalErrorHandlers } = await import('./lib/server/logger');
  registerGlobalErrorHandlers();
}
