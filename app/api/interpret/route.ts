// app/api/interpret/route.ts
// AI 解读流式接口（SSE）。
// 输入：{ chart: ZiweiChart, messages: {role, content}[] }
// 输出：text/event-stream，每行 `data: {"delta":{"text":"..."}}`，结尾 `data: [DONE]`
// 与前端 components/InsightPanel.tsx 的流式解析逻辑对齐。
// 经 pipeModeratedStream 统一做「软过滤 + 硬阻断 + 免责尾注」审查。

import type { NextRequest } from 'next/server';
import { type ChatMessage } from '@/lib/server/llm';
import { buildSystemPrompt, buildChartContext } from '@/lib/server/prompt';
import { getClientIp, rateLimit } from '@/lib/server/ratelimit';
import { pipeModeratedStream } from '@/lib/server/moderation';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 分布式限流（优先 Redis）：AI 解读为高频高成本接口，按 IP 限频防止刷量
  const rl = await rateLimit({ key: `rl:interpret:${getClientIp(req)}`, windowMs: 60_000, max: 15 });
  if (!rl.success) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }

  let body: { chart?: ZiweiChart; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const chart = body.chart;
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

  const conversation: ChatMessage[] = [
    buildSystemPrompt(),
    {
      role: 'user',
      content: chart
        ? `以下是用户命盘的结构化信息，请据此回答后续提问：\n\n${buildChartContext(chart)}`
        : '（未提供命盘，请基于通用紫微斗数知识回答。）',
    },
    ...messages,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await pipeModeratedStream(conversation, controller, encoder, {
        onComplete: (_full, report) => {
          if (report.level !== 'safe') {
            console.warn('[moderation:interpret]', report.level, 'block=', report.blockHits, 'warn=', report.warnHits);
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
