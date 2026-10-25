/**
 * Next.js 启动钩子（instrumentation）
 * 服务端进程启动时校验生产密钥：若 NEXTAUTH_SECRET 缺失或为开发占位值，
 * validateSecrets() 会抛错使进程启动失败，避免带着弱密钥上线。
 */
export async function register() {
  // 仅在 Node 服务端运行时校验；Edge runtime（middleware）跳过。
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateSecrets } = await import('./lib/server/secrets');
    validateSecrets();
  }
}
