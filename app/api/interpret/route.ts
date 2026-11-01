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
import { resolveIdentity, checkQuota } from '@/lib/billing/quota';
import { incTrial } from '@/lib/db';
import { getV4Interpretation, detectV4DimensionKey, v4DimensionLabel } from '@/lib/server/interp-v4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 分布式限流（优先 Redis）：AI 解读为高频高成本接口，按 IP 限频防止刷量
  const rl = await rateLimit({ key: `rl:interpret:${getClientIp(req)}`, windowMs: 60_000, max: 15 });
  if (!rl.success) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }

  // 硬付费墙：会员放行；非会员超出免费试用次数直接 402，前端据此弹付费墙。
  const { identity, setCookie } = await resolveIdentity(req);
  const quota = await checkQuota(identity);
  if (!quota.ok) {
    const res = new Response(
      JSON.stringify({ error: quota.reason, code: 'PAYMENT_REQUIRED' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  }
  // 通过配额校验后计入一次试用（会员为 identity.id 同样计数，但不影响放行）
  await incTrial(identity.id);

  let body: { chart?: ZiweiChart; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const chart = body.chart;
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

  // ── v4.0 权威底稿 ──
  // 命中数据集时，取「当前提问主题对应维度」作为底稿交给 LLM 润色，
  // 使在线解读与离线数据集口径一致；未命中 / 数据集不可用则回退纯 LLM。
  let v4DraftMsg: ChatMessage | null = null;
  try {
    const bi = (chart as
      | { birthInfo?: { year?: number; month?: number; day?: number; hour?: number; gender?: string } }
      | undefined)?.birthInfo;
    const validBirth =
      bi &&
      typeof bi.year === 'number' &&
      typeof bi.month === 'number' &&
      typeof bi.day === 'number' &&
      typeof bi.hour === 'number' &&
      (bi.gender === 'male' || bi.gender === 'female');

    if (validBirth && bi) {
      const v4 = await getV4Interpretation({
        year: bi.year as number,
        month: bi.month as number,
        day: bi.day as number,
        hour: bi.hour as number,
        gender: bi.gender as 'male' | 'female',
      });
      const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      const dimKey = detectV4DimensionKey(lastUser);
      const draft = v4?.content?.[dimKey] ?? v4?.content?.overview;
      if (draft) {
        const label = v4DimensionLabel(dimKey);
        v4DraftMsg = {
          role: 'user',
          content: `以下是该命盘在「${label}」维度的权威论断底稿（来源：紫微斗数开源解读数据集 v4.0，2026-10-15 版断语库）。

请以底稿的事实与结论为权威依据进行润色、扩写与个性化表达：
- 保持底稿的核心判断与结论，不得推翻或编造与之矛盾的说法；
- 优化行文流畅度与可读性，可补充命盘依据、关键时间窗口与温和建议；
- 继续使用 **【小标题】** 与 **加粗** 的 Markdown 结构输出；
- 底稿未涵盖之处，可基于命盘结构自行补充。

【${label}·权威底稿】
${draft}`,
        };
      }
    }
  } catch {
    /* 数据集不可用 / 解压失败时静默回退纯 LLM */
  }

  const conversation: ChatMessage[] = [
    buildSystemPrompt(),
    {
      role: 'user',
      content: chart
        ? `以下是用户命盘的结构化信息，请据此回答后续提问：\n\n${buildChartContext(chart)}`
        : '（未提供命盘，请基于通用紫微斗数知识回答。）',
    },
    ...(v4DraftMsg ? [v4DraftMsg] : []),
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

  const streamHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
  // 首次访问下发游客 cookie，保证后续请求复用同一身份，试用次数才能累计
  if (setCookie) streamHeaders['Set-Cookie'] = setCookie;
  return new Response(stream, { headers: streamHeaders });
}
