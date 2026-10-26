/**
 * 结构化日志 + 全局错误捕获 + 可选 Sentry 上报
 * ─────────────────────────────────────────────────────────────
 * - 默认输出 JSON 行日志（便于容器/日志平台采集）；
 * - 通过 SENTRY_DSN 门控 Sentry：未安装 @sentry/nextjs 时优雅降级，
 *   不引入任何外部依赖、不破坏构建；接入方式见下方注释。
 * - registerGlobalErrorHandlers() 在 instrumentation 中调用一次。
 */
type Level = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  err?: unknown;
  [k: string]: unknown;
}

function emit(level: Level, msg: string, meta?: LogMeta): void {
  const entry: Record<string, unknown> = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...(meta || {}),
  };
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(entry));
  } else if (level === 'debug' && process.env.NODE_ENV === 'production') {
    return; // 生产环境丢弃 debug
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }

  // 可选 Sentry 上报点（错误级别）：
  // 接入步骤：1) npm i @sentry/nextjs  2) next.config 配置 Sentry 3) 取消下方注释
  // if (level === 'error' && process.env.SENTRY_DSN) {
  //   const Sentry = require('@sentry/nextjs');
  //   Sentry.captureException(meta?.err ?? new Error(msg));
  // }
}

export const logger = {
  info: (msg: string, meta?: LogMeta) => emit('info', msg, meta),
  warn: (msg: string, meta?: LogMeta) => emit('warn', msg, meta),
  error: (msg: string, meta?: LogMeta) => emit('error', msg, meta),
  debug: (msg: string, meta?: LogMeta) => emit('debug', msg, meta),
};

/** 注册进程级未捕获异常/拒绝的处理器，统一走结构化日志。仅调用一次。 */
export function registerGlobalErrorHandlers(): void {
  process.on('uncaughtException', (err: Error) => {
    logger.error('uncaughtException', { err: err.message, stack: err.stack });
  });
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('unhandledRejection', { reason: reason instanceof Error ? reason.message : String(reason) });
  });
}
