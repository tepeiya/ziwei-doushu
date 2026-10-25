// lib/server/moderation.ts
// AI 输出审查中间件（服务端、Node 运行时）。
//
// 背景：LLM 输出不可控，而紫微斗数业务天然涉及健康 / 六亲 / 投资等敏感维度。
// 本模块在「流式 SSE 转发给用户之前」做两层处理，并作为统一管道供各 AI 接口复用：
//   1) 软过滤（warn 级）：把绝对化 / 承诺式措辞实时替换为中性表述，软化输出。
//   2) 硬阻断（block 级）：命中诈骗诱导、医疗断言、高危绝对化等词时，立即停止
//      后续生成并替换为合规纠错声明，不再把违规内容继续发给用户。
// 另提供流末完整文本复核 + 免责尾注 + 审计钩子（onComplete）。
//
// 已知边界（已在部署指南说明）：流式场景下已发出的 token 无法物理撤回，
// 因此 block 级采用「命中即停 + 末端纠错」策略；若业务需 100% 拦截，
// 应改用非流式（先完整生成 → 审查 → 再回传）或接入专业内容安全 API。

import { streamChat, type ChatMessage } from './llm';

// ── 软过滤词表：绝对化 / 承诺式 → 中性表述 ──
const DEFAULT_SOFT_TERMS: Record<string, string> = {
  一定不会: '通常不易',
  肯定不会: '多半不易',
  一定会: '多半会',
  一定会死: '需格外注意健康',
  一定: '通常',
  肯定: '多半',
  保证: '倾向于',
  必定: '往往',
  必然: '可能',
  绝对: '一般',
  百分百: '多数情况下',
  百分之百: '多数情况下',
  注定: '可能',
  必须: '建议',
  只能: '更宜',
  必然的: '可能的',
};

// ── 硬阻断词表：诈骗 / 医疗断言 / 高危绝对化（生死、婚姻）──
const DEFAULT_BLOCK_TERMS = [
  // 诈骗 / 私下交易诱导
  '加微信', '加我微信', '加QQ', '私聊', '私下转账', '转账付费',
  '发红包', '付费解锁', '内部代码', '扫码付费', '代算命',
  // 医疗断言
  '包治百病', '药到病除', '保证治好', '包你好', '根治百病', '一针见效',
  // 高危绝对化（生死 / 婚姻）
  '必死', '活不过', '注定离婚', '注定孤老', '注定单身', '不能结婚', '一定会死',
];

function splitEnvList(v?: string): string[] | null {
  if (!v) return null;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadSoftTerms(): Record<string, string> {
  const fromEnv = splitEnvList(process.env.MODERATION_SOFT_TERMS);
  const base: Record<string, string> = { ...DEFAULT_SOFT_TERMS };
  if (fromEnv) {
    for (const pair of fromEnv) {
      const idx = pair.indexOf(':');
      if (idx > 0) {
        const k = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        if (k && val) base[k] = val;
      }
    }
  }
  return base;
}

function loadBlockTerms(): string[] {
  const fromEnv = splitEnvList(process.env.MODERATION_BLOCK_TERMS);
  return fromEnv
    ? Array.from(new Set([...DEFAULT_BLOCK_TERMS, ...fromEnv]))
    : DEFAULT_BLOCK_TERMS;
}

// 模块加载时读取一次；env 在启动时确定，运行期热更新非必需。
const SOFT_TERMS = loadSoftTerms();
const BLOCK_TERMS = loadBlockTerms();

export const MODERATION_DISCLAIMER =
  '\n\n---\n*以上内容为传统紫微斗数文化视角的**娱乐参考**，不构成任何人生、医疗、投资或法律决策建议。健康问题请务必以现代医学为准。*';

export const BLOCK_NOTICE =
  '\n\n⚠️ 系统检测到前述内容包含不恰当的绝对化或违规表述，已自动停止生成并作合规处理。' +
  '本平台所有内容仅作传统命理文化娱乐参考，不构成任何建议。';

export type ModerationLevel = 'safe' | 'warn' | 'block';

export interface ModerationReport {
  level: ModerationLevel;
  blockHits: string[];
  warnHits: string[];
  truncated: boolean;
}

export function isModerationEnabled(): boolean {
  return (process.env.MODERATION_ENABLED ?? 'true').toLowerCase() !== 'false';
}

/** warn 级软过滤：把绝对化措辞替换为中性表述（跨块边界安全，按子串替换）。 */
export function softFilter(text: string): string {
  let out = text;
  // 长词优先，避免「一定不会」被「一定」先行替换而漏掉
  const entries = Object.entries(SOFT_TERMS).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    if (k) out = out.split(k).join(v);
  }
  return out;
}

/** 命中 block 级词（诈骗 / 医疗断言 / 高危绝对化）。 */
export function findBlockHits(text: string): string[] {
  return BLOCK_TERMS.filter((t) => text.includes(t));
}

/** 命中 warn 级词（绝对化 / 承诺式）。 */
export function findWarnHits(text: string): string[] {
  const hits: string[] = [];
  for (const k of Object.keys(SOFT_TERMS)) {
    if (k && text.includes(k)) hits.push(k);
  }
  return hits;
}

/** 对完整文本做复核，返回审查报告。 */
export function scanFull(text: string): ModerationReport {
  const blockHits = findBlockHits(text);
  const warnHits = findWarnHits(text);
  const level: ModerationLevel = blockHits.length ? 'block' : warnHits.length ? 'warn' : 'safe';
  return { level, blockHits, warnHits, truncated: false };
}

export interface PipeOpts {
  /** 测试 / 自定义用，默认使用 streamChat(messages)。 */
  gen?: AsyncGenerator<string>;
  /** 流末是否追加免责尾注，默认 true。 */
  disclaimer?: boolean;
  /** 完整文本审查后的审计钩子（告警 / 落库 / 上报内容安全）。 */
  onComplete?: (full: string, report: ModerationReport) => void | Promise<void>;
}

/**
 * 统一流式审查管道：把 LLM 的 SSE 增量经「软过滤 + 硬阻断 + 末端复核 + 免责尾注」
 * 处理后转发给 SSE controller。被各 AI 接口复用，审查逻辑一处维护。
 */
export async function pipeModeratedStream(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  opts: PipeOpts = {},
): Promise<void> {
  const enabled = isModerationEnabled();
  const appendDisclaimer = opts.disclaimer ?? true;
  const gen = opts.gen ?? streamChat(messages);
  const full: string[] = [];
  let blocked = false;
  let blockedBy: string[] = [];

  const send = (text: string) => {
    if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`));
  };

  try {
    for await (const raw of gen) {
      const delta = enabled ? softFilter(raw) : raw;
      if (enabled) {
        const hits = findBlockHits(delta);
        if (hits.length) {
          blocked = true;
          blockedBy = hits;
          send(BLOCK_NOTICE);
          break;
        }
      }
      full.push(delta);
      send(delta);
    }
  } catch {
    send('⚠️ 解读生成中断，请稍后重试。');
  } finally {
    let text = full.join('');
    if (!blocked && appendDisclaimer) {
      // 末端复核：捕获流式分块边界可能遗漏的 block 词（双保险）
      const tailBlocked = enabled && findBlockHits(text).length > 0;
      const tail = tailBlocked ? BLOCK_NOTICE : MODERATION_DISCLAIMER;
      send(tail);
      text += tail;
      if (tailBlocked) blocked = true;
    }
    const base = scanFull(text);
    const report: ModerationReport = {
      ...base,
      // 流式阻断时违规词落在被截断的分块，未进入文本；如实标记 level 并补充触发词
      level: blocked ? 'block' : base.level,
      blockHits: blocked && base.blockHits.length === 0 ? blockedBy : base.blockHits,
      truncated: blocked,
    };
    try {
      await opts.onComplete?.(text, report);
    } catch {
      // 审计失败不影响主流程
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }
}
