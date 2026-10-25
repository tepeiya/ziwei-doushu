// app/api/heming/route.ts
// 合盘 AI 解读流式接口（SSE）。复用前端 app/heming/page.tsx 的调用约定：
//   输入 { chartA: ZiweiChart, chartB: ZiweiChart, question?: string }
//   输出 data: {"delta":{"text":...}} ... data: [DONE]
//
// 合规：仅使用紫微斗数通用技法（双宫联参、四化飞化、大限同步）与命盘数据，
//       不引用倪海厦《天纪》原话（CC BY-NC-SA 禁止商用）。
// 经 pipeModeratedStream 统一做「软过滤 + 硬阻断 + 免责尾注」审查。

import type { NextRequest } from 'next/server';
import { type ChatMessage } from '@/lib/server/llm';
import { buildChartContext } from '@/lib/server/prompt';
import { getClientIp, rateLimit } from '@/lib/server/ratelimit';
import { pipeModeratedStream } from '@/lib/server/moderation';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEMING_SYSTEM = [
  '你是一位精通紫微斗数合盘（双盘配对）分析的命理师，基于传统紫微斗数体系为两人关系做专业、温和、负责任的分析。',
  '',
  '合盘核心技术框架（通用技法，非任一特定师承原话）：',
  '1. 双宫联参：同时看双方「命宫 + 夫妻宫 + 福德宫」，单看夫妻宫不足以定吉凶。',
  '2. 夫妻宫互参：甲方夫妻宫主星是否对应乙方命宫/三合方；双方四化（化禄/权/科/忌）状态，化禄主缘厚、化忌主磨合。',
  '3. 日月互参：女命看太阳（夫星）、男命看太阴（妻星）之庙旺落陷。',
  '4. 四化飞化互参：一方生年四化飞入对方何宫（化禄入财帛主助益、化忌入夫妻主消耗）。',
  '5. 大限同步：双方当前大限是否同走旺运。',
  '',
  '合规红线（必须遵守）：',
  '- 内容仅作传统命理文化「娱乐参考」，不构成任何人生、情感、婚姻、医疗或法律决策建议。',
  '- 不夸大、不恐吓、不做绝对化断语；涉及健康仅作传统养生泛谈，并建议以现代医学为准。',
  '- 使用 Markdown（**【小标题】** 与 **加粗** 分层），条理清晰、语气平和、给予建设性视角。',
].join('\n');

export async function POST(req: NextRequest) {
  // 分布式限流（优先 Redis）：AI 解读为高频高成本接口，按 IP 限频防止刷量
  const rl = await rateLimit({ key: `rl:heming:${getClientIp(req)}`, windowMs: 60_000, max: 8 });
  if (!rl.success) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }

  let body: { chartA?: ZiweiChart; chartB?: ZiweiChart; question?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!body.chartA || !body.chartB) {
    return new Response('缺少命盘数据', { status: 400 });
  }

  const conversation: ChatMessage[] = [
    { role: 'system', content: HEMING_SYSTEM },
    {
      role: 'user',
      content: `甲方命盘：\n${buildChartContext(body.chartA)}\n\n乙方命盘：\n${buildChartContext(body.chartB)}`,
    },
    {
      role: 'user',
      content: body.question
        ? `请基于以上双盘，回答：${body.question}`
        : '请基于以上双盘，给出全面合盘分析：缘分匹配度、感情走向、相处建议、以及是否适合合伙创业。',
    },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await pipeModeratedStream(conversation, controller, encoder, {
        onComplete: (_full, report) => {
          if (report.level !== 'safe') {
            console.warn('[moderation:heming]', report.level, 'block=', report.blockHits, 'warn=', report.warnHits);
          }
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
