// app/api/fortune/route.ts
// 流年 / 年度运势解读流式接口（SSE）。
//   输入 { chart: ZiweiChart, year: number }
//   输出 data: {"delta":{"text":...}} ... data: [DONE]
//
// 合规：仅使用通用紫微技法与命盘数据，不引用倪海厦《天纪》原话。

import type { NextRequest } from 'next/server';
import { streamChat, type ChatMessage } from '@/lib/server/llm';
import { buildChartContext } from '@/lib/server/prompt';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORTUNE_SYSTEM = [
  '你是一位精通紫微斗数流年运势分析的命理师，基于传统紫微斗数体系为用户做某一年度的运势解析。',
  '',
  '分析要点（通用技法）：',
  '1. 结合命盘本格与大限走势，定位该流年所行宫位与飞星影响。',
  '2. 分维度展开：事业/学业、财运、感情人际、健康（传统养生角度）。',
  '3. 指出该年关键时间窗口与注意事项，给予温和、建设性的视角。',
  '',
  '合规红线（必须遵守）：',
  '- 内容仅作传统命理文化「娱乐参考」，不构成任何人生、投资、医疗或法律决策建议。',
  '- 不夸大、不恐吓、不做绝对化断言；健康维度仅作传统养生泛谈，并明确建议以现代医学为准。',
  '- 使用 Markdown（**【小标题】** 与 **加粗** 分层）。',
].join('\n');

export async function POST(req: NextRequest) {
  let body: { chart?: ZiweiChart; year?: number };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!body.chart || !body.year) {
    return new Response('缺少命盘或年份', { status: 400 });
  }

  const conversation: ChatMessage[] = [
    { role: 'system', content: FORTUNE_SYSTEM },
    { role: 'user', content: `以下是用户命盘的结构化信息：\n\n${buildChartContext(body.chart)}` },
    {
      role: 'user',
      content: `请分析 ${body.year} 年（流年）该命盘主人的运势，涵盖事业/学业、财运、感情人际、健康（传统养生角度）四个维度，并给出该年关键时间窗口与温和建议。`,
    },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of streamChat(conversation)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text: delta } })}\n\n`));
        }
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: { text: '⚠️ 运势分析生成中断，请稍后重试。' } })}\n\n`),
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
