// app/api/interpret/route.ts
// AI 解读流式接口（SSE）。
// 输入：{ chart: ZiweiChart, messages: {role, content}[] }
// 输出：text/event-stream，每行 `data: {"delta":{"text":"..."}}`，结尾 `data: [DONE]`
// 与前端 components/InsightPanel.tsx 的流式解析逻辑对齐。

import type { NextRequest } from 'next/server';
import { streamChat, type ChatMessage } from '@/lib/server/llm';
import { buildSystemPrompt, buildChartContext } from '@/lib/server/prompt';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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
      try {
        for await (const delta of streamChat(conversation)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: { text: delta } })}\n\n`),
          );
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ delta: { text: '⚠️ 解读生成中断，请稍后重试。' } })}\n\n`,
          ),
        );
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
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
