// lib/server/prompt.ts
// 把 ZiweiChart 序列化为 LLM 可理解的命盘背景文本，并提供 system prompt。
//
// 合规要点：
//  - 仅使用紫微斗数通用专业术语，不引用倪海厦《天纪》原话（其协议 CC BY-NC-SA 禁止商用）。
//  - 强制娱乐/文化参考口径，禁止医疗、绝对化、恐吓性表述。

import type { ZiweiChart } from '@/lib/ziwei/types';
import type { ChatMessage } from './llm';

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function buildSystemPrompt(): ChatMessage {
  return {
    role: 'system',
    content: [
      '你是一位精通紫微斗数的命理分析师，基于传统紫微斗数体系（安星、四化飞星、格局、宫位互动）为用户做专业、温和、负责任的解读。',
      '',
      '要求：',
      '1. 使用紫微斗数通用专业术语，逻辑清晰、条理分明。',
      '2. 必须结合提供的命盘数据（主星、亮度、四化、宫位互动）展开分析，避免空话套话。',
      '3. 语气专业平和，给予建设性视角，不夸大、不恐吓。',
      '4. 严格遵守合规红线：所有内容仅作为传统命理文化视角的「娱乐参考」，',
      '   不构成任何人生、医疗、投资或法律决策建议；不得做出绝对化、承诺式或医疗断言。',
      '5. 如涉及健康，仅作传统养生文化角度的泛泛提醒，并明确建议以现代医学为准。',
      '6. 按用户提问维度展开，使用 Markdown（可用 **【小标题】** 与 **加粗** 分层）。',
    ].join('\n'),
  };
}

export function buildChartContext(chart: ZiweiChart): string {
  const lines: string[] = [];
  const b = chart.birthInfo;

  lines.push(
    `出生：公历 ${b.year}年${b.month}月${b.day}日 ${BRANCH[b.hour]}时（时辰序号 ${b.hour}） ${b.gender === 'male' ? '男命' : '女命'}`,
  );
  if (chart.lunarInfo.fourPillars) {
    lines.push(`四柱：${chart.lunarInfo.fourPillars.join('  ')}`);
  }
  lines.push(
    `五行局：${chart.wuxingJuName}；命宫：${BRANCH[chart.mingGongBranch]}；身宫：${BRANCH[chart.shenGongBranch]}`,
  );
  if (chart.mingZhu || chart.yinYangGender) {
    lines.push(
      `命主：${chart.mingZhu ?? '—'}；身主：${chart.shenZhu ?? '—'}；阴阳：${chart.yinYangGender ?? '—'}`,
    );
  }
  lines.push('');
  lines.push('十二宫（地支·宫名·主星[亮度]·四化 / 自化）：');

  for (const p of chart.palaces) {
    const stars = p.stars.length
      ? p.stars
          .map((s) => {
            const br = s.brightnessRaw ? s.brightnessRaw : s.brightness ? `(${s.brightness})` : '';
            const sh = s.siHua ? `化${s.siHua}` : '';
            return `${s.name}${br}${sh}`;
          })
          .join('、')
      : `（空宫，借对宫${p.borrowedFromName ?? ''}：${(p.borrowedStars ?? []).join('、')}）`;
    const self = p.selfSihua?.length
      ? ` ｜自化:${p.selfSihua.map((x) => `${x.starName}${x.siHua}`).join('、')}`
      : '';
    lines.push(`  ${BRANCH[p.branch]}·${p.name}：${stars}${self}`);
  }

  lines.push('');
  lines.push('大限：');
  lines.push(
    chart.daXians
      .map((d) => {
        const sh = d.siHua ? ` 四化:${[d.siHua.lu, d.siHua.quan, d.siHua.ke, d.siHua.ji].join('/')}` : '';
        return `${d.startAge}-${d.endAge}岁(${d.palaceName}${sh})`;
      })
      .join('；'),
  );

  return lines.join('\n');
}
