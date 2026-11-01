// lib/exportPdf.ts
// 前端 PDF 命书导出（矢量文字版）。
//
// 为什么不用图片：html2canvas 把正文渲染成位图再切片，文字不可选中、放大发虚、
// 且超长正文会触发 canvas 尺寸上限崩溃。本版改用 jsPDF 矢量 text 直接排版：
// · 中文完整可用（嵌入 HeiTi 中文字体，jsPDF 自动子集化，PDF 体积小、可选中/复制）
// · 自己实现流式分页 + 页眉/页脚 + 封面，版式精致可控
// · 加粗用 fillThenStroke 模拟，章节标题带金色竖条
//
// 字体：/public/fonts/HeiTi.ttf（浏览器端 fetch 后嵌入）

import { jsPDF } from 'jspdf';
import type { ZiweiChart } from './ziwei/types';

export interface PdfInput {
  name?: string;
  birth?: string;
  text: string; // 解读正文（Markdown 简化：按换行分段，**加粗**）
}

export interface AnnualPdfInput extends PdfInput {
  year: number;
}

/** 站点网址（用于封面 / 页脚落款）。优先取部署环境变量，否则回退到品牌站 */
function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw && !/localhost|127\.0\.0\.1/.test(raw)) return raw.replace(/^https?:\/\//, '');
  return 'zw.lbzsj.com';
}

interface DocSpec {
  title: string;
  meta: string;
  text: string;
  footer: string;
  subtitle: string;
  filename: string;
  site: string;
}

// ---- 颜色 ----
type RGB = [number, number, number];
const GOLD: RGB = [184, 146, 42];
const GOLD_A: RGB = [184, 146, 42]; // 浅金（分隔线）
const ACCENT: RGB = [91, 64, 16]; // 深金（标题）
const SEAL_RED: RGB = [181, 52, 31];
const TEXT_DARK: RGB = [42, 33, 22];
const HEADING: RGB = [139, 106, 20];
const MUTED: RGB = [154, 138, 104];

const FONT_NAME = 'HeiTi';

// ---- 字体加载（带缓存）----
let _fontB64: string | null = null;
async function ensureFont(doc: jsPDF): Promise<void> {
  if (_fontB64 === null) {
    const res = await fetch('/fonts/HeiTi.ttf');
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
    }
    _fontB64 = btoa(bin);
  }
  doc.addFileToVFS('HeiTi.ttf', _fontB64);
  doc.addFont('HeiTi.ttf', FONT_NAME, 'normal');
  doc.setFont(FONT_NAME, 'normal');
}

// ---- 工具 ----
function setFill(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

/** 竖向渐变填充（用细条模拟） */
function vGradient(doc: jsPDF, x: number, y: number, w: number, h: number, top: RGB, bot: RGB, steps: number) {
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(top[0] + (bot[0] - top[0]) * t);
    const g = Math.round(top[1] + (bot[1] - top[1]) * t);
    const b = Math.round(top[2] + (bot[2] - top[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x, y + (h * i) / steps, w, h / steps + 1, 'F');
  }
}

/** 朱红印章（矢量）：红底白字圆角方块 + 内白边 */
function drawSeal(doc: jsPDF, cx: number, cy: number, size: number, char = '命') {
  setFill(doc, SEAL_RED);
  doc.roundedRect(cx - size / 2, cy - size / 2, size, size, size * 0.1, size * 0.1, 'F');
  setDraw(doc, [255, 255, 255]);
  doc.setLineWidth(1.4);
  doc.roundedRect(cx - size / 2 + 2.5, cy - size / 2 + 2.5, size - 5, size - 5, size * 0.08, size * 0.08, 'S');
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(Math.round(size * 0.56));
  setText(doc, [255, 255, 255]);
  doc.text(char, cx, cy, { baseline: 'middle', align: 'center' } as any);
}

// ---- 封面（矢量）----
function drawCover(doc: jsPDF, spec: DocSpec, pdfW: number, pdfH: number) {
  vGradient(doc, 0, 0, pdfW, pdfH, [255, 253, 246], [246, 234, 208], 160);

  const m = 46;
  setDraw(doc, GOLD);
  doc.setLineWidth(2);
  doc.rect(m, m, pdfW - 2 * m, pdfH - 2 * m);
  doc.setLineWidth(1);
  setDraw(doc, GOLD_A);
  doc.rect(m + 14, m + 14, pdfW - 2 * m - 28, pdfH - 2 * m - 28);

  // 四角装饰
  const cs = 18;
  const off = m + 10;
  setDraw(doc, GOLD);
  doc.setLineWidth(2);
  const corners: [number, number][] = [
    [off, off],
    [pdfW - off - cs, off],
    [off, pdfH - off - cs],
    [pdfW - off - cs, pdfH - off - cs],
  ];
  for (const [cx, cy] of corners) doc.rect(cx, cy, cs, cs);

  const cx = pdfW / 2;
  let y = pdfH * 0.28;

  // 印章
  const s = 46;
  drawSeal(doc, cx, y + s / 2, s);
  y += s + 20;

  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(26);
  setText(doc, ACCENT);
  doc.text(spec.title, cx, y, { baseline: 'top', align: 'center' } as any);
  y += 34;

  doc.setFontSize(11);
  setText(doc, MUTED);
  doc.text(spec.subtitle, cx, y, { baseline: 'top', align: 'center' } as any);
  y += 30;

  setDraw(doc, GOLD);
  doc.setLineWidth(1);
  doc.line(cx - 70, y, cx + 70, y);
  y += 34;

  doc.setFontSize(12);
  setText(doc, TEXT_DARK);
  for (const ml of spec.meta.split('\n')) {
    doc.text(ml, cx, y, { baseline: 'top', align: 'center' } as any);
    y += 22;
  }
  y += 6;

  const now = new Date();
  const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  doc.setFontSize(9);
  setText(doc, MUTED);
  doc.text(`生成日期：${dateStr}`, cx, y, { baseline: 'top', align: 'center' } as any);
  y += 18;

  doc.setFontSize(10);
  setText(doc, ACCENT);
  doc.text(spec.site, cx, y, { baseline: 'top', align: 'center' } as any);

  // 底部免责声明（自动换行）
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(7.5);
  setText(doc, MUTED);
  const dw = pdfW - 2 * (m + 36);
  const dlines = wrapPlain(doc, spec.footer, dw, 7.5);
  let dy = pdfH - m - 12 - dlines.length * 10;
  for (const dl of dlines) {
    doc.text(dl, cx, dy, { baseline: 'top', align: 'center' } as any);
    dy += 10;
  }
}

// ---- 页眉（矢量）----
function drawHeader(doc: jsPDF, spec: DocSpec, margin: number, imgW: number, headerH: number) {
  const hy = margin;
  const s = 18;
  drawSeal(doc, margin + s / 2, hy + s / 2, s);
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(10.5);
  setText(doc, ACCENT);
  doc.text(spec.title, margin + s + 8, hy, { baseline: 'top' } as any);
  doc.setFontSize(8.5);
  setText(doc, ACCENT);
  doc.text(spec.site, margin + imgW, hy + 6, { baseline: 'top', align: 'right' } as any);
  setDraw(doc, GOLD_A);
  doc.setLineWidth(0.6);
  doc.line(margin, hy + headerH - 4, margin + imgW, hy + headerH - 4);
}

// ---- 页脚（矢量）----
function drawFooter(doc: jsPDF, spec: DocSpec, margin: number, imgW: number, footerH: number, page: number, total: number) {
  const fy = doc.internal.pageSize.getHeight() - margin - footerH;
  setDraw(doc, GOLD_A);
  doc.setLineWidth(0.5);
  doc.line(margin, fy + 2, margin + imgW, fy + 2);
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(8.5);
  setText(doc, MUTED);
  doc.text(`— 第 ${page} / ${total} 页 —`, margin + imgW / 2, fy + 6, {
    baseline: 'top',
    align: 'center',
  } as any);
}

// ---- 排版辅助 ----
interface Seg {
  text: string;
  bold: boolean;
}

/** 解析行内 **加粗** 为分段 */
function parseSegments(line: string): Seg[] {
  const segs: Seg[] = [];
  for (const part of line.split(/(\*\*[^*]+\*\*)/)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) segs.push({ text: part.slice(2, -2), bold: true });
    else segs.push({ text: part, bold: false });
  }
  return segs;
}

/** 按字符断行（CJK 可在任意字间断行）。
 *  maxWidthFor(lineIndex) 返回第 lineIndex 行允许的最大文本宽度，
 *  用于首行缩进时其余空间收窄，使每行右边界都落在页眉/页脚线内。 */
function wrapSegments(doc: jsPDF, segs: Seg[], maxWidthFor: (lineIndex: number) => number): Seg[][] {
  const lines: Seg[][] = [];
  let cur: Seg[] = [];
  let curW = 0;
  let lineIdx = 0;
  for (const seg of segs) {
    for (const ch of [...seg.text]) {
      const w = doc.getTextWidth(ch);
      const maxW = maxWidthFor(lineIdx);
      if (curW + w > maxW && (cur.length > 0 || curW > 0)) {
        lines.push(cur);
        cur = [];
        curW = 0;
        lineIdx += 1;
        cur.push({ text: ch, bold: seg.bold });
        curW = w;
      } else {
        cur.push({ text: ch, bold: seg.bold });
        curW += w;
      }
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/** 纯文本断行（用于免责声明） */
function wrapPlain(doc: jsPDF, text: string, maxW: number, size: number): string[] {
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(size);
  const lines: string[] = [];
  let cur = '';
  let curW = 0;
  for (const ch of [...text]) {
    const w = doc.getTextWidth(ch);
    if (curW + w > maxW && cur) {
      lines.push(cur);
      cur = ch;
      curW = w;
    } else {
      cur += ch;
      curW += w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 将 spec 渲染为「封面 + 带页眉页脚的正文多页」矢量 PDF 并触发下载 */
async function specToPdf(spec: DocSpec): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  await ensureFont(doc);

  const pdfW = doc.internal.pageSize.getWidth();
  const pdfH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const imgW = pdfW - margin * 2;
  const headerH = 26;
  const footerH = 20;
  const topGap = 10;
  const bottomGap = 14;
  const topWindow = margin + headerH + topGap;
  const bottomWindow = pdfH - margin - footerH - bottomGap;

  const BODY = 10.5;
  const LH = 18;
  const HEAD = 12.5;
  const HEADLH = 20;
  const INDENT = 21;
  const PARA_GAP = 6;

  // 第 1 页：封面
  drawCover(doc, spec, pdfW, pdfH);

  const rawLines = spec.text.replace(/\r\n/g, '\n').split('\n');
  const hasContent = rawLines.some((l) => l.trim() !== '');
  if (!hasContent) {
    doc.save(spec.filename);
    return;
  }

  // 正文流式布局
  let y = topWindow;
  const ensure = (h: number) => {
    if (y + h > bottomWindow) {
      doc.addPage();
      y = topWindow;
    }
  };
  const addHeading = (text: string) => {
    ensure(HEADLH + 10);
    y += 6;
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    setFill(doc, GOLD);
    doc.rect(margin, y, 3, HEAD + 4, 'F');
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(HEAD);
    setText(doc, HEADING);
    doc.text(text, margin + 10, y, { baseline: 'top' } as any);
    y += HEADLH + 4;
  };
  const addParagraph = (line: string) => {
    const segs = parseSegments(line);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(BODY);
    // 首行缩进 INDENT，故其可排宽度收窄为 imgW - INDENT；
    // 其余行从 margin 起排，宽度为 imgW。两者右边界均落在 margin+imgW，
    // 与页眉/页脚分隔线齐平，正文不会超出线外。
    const wrapped = wrapSegments(doc, segs, (i) => (i === 0 ? imgW - INDENT : imgW));
    let first = true;
    for (const ln of wrapped) {
      ensure(LH);
      let x = margin + (first ? INDENT : 0);
      setText(doc, TEXT_DARK);
      for (const seg of ln) {
        if (seg.bold) {
          doc.setLineWidth(0.3);
          doc.setDrawColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
          doc.text(seg.text, x, y, { baseline: 'top', renderingMode: 'fillThenStroke' } as any);
        } else {
          doc.text(seg.text, x, y, { baseline: 'top' } as any);
        }
        x += doc.getTextWidth(seg.text);
      }
      y += LH;
      first = false;
    }
    y += PARA_GAP;
  };

  doc.addPage();
  y = topWindow;
  for (const r of rawLines) {
    const line = r.trim();
    if (line === '') {
      ensure(8);
      y += 8;
      continue;
    }
    const m = line.match(/^\*\*【(.+?)】\*\*$/);
    if (m) {
      addHeading('【' + m[1] + '】');
      continue;
    }
    addParagraph(line);
  }

  // 末页补页脚留白由 bottomWindow 保证；逐页绘制页眉页脚
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    drawHeader(doc, spec, margin, imgW, headerH);
    drawFooter(doc, spec, margin, imgW, footerH, p, total);
  }

  doc.save(spec.filename);
}

/** 命盘基础信息兜底解读（当 AI 解读与 v4 数据集皆为空时使用，保证内容页不空白） */
function buildFallbackReading(chart: ZiweiChart): string {
  const ming = chart.palaces?.find((p) => p.isMingGong) ?? chart.palaces?.[chart.mingGongBranch];
  const majorStars = (ming?.stars ?? []).filter((s) => s.type === 'major').map((s) => s.name);
  const starText = majorStars.length
    ? majorStars.join('、')
    : ming?.borrowedStars?.join('、') ?? '（空宫）';
  return [
    '**【命盘基础信息】**',
    `命宫主星：${starText}`,
    `五行局：${chart.wuxingJuName || '—'}`,
    `命主星：${chart.mingZhu || '—'}　身主星：${chart.shenZhu || '—'}`,
    '',
    '**【说明】**',
    '本命书当前尚未包含 AI 深度解读。请在右侧选择「命格 / 感情 / 事业 / 财运 / 健康 / 性格」主题生成解读，' +
      '或加载 v4.0 数据集的 13 维原生解读后重新导出，内容将更加完整详实。',
  ].join('\n');
}

/**
 * 拉取 v4.0 数据集的 13 维原生解读，格式化为 Markdown 文本段。
 * 失败或未命中时返回空串（不影响主解读导出）。仅浏览器端调用。
 */
export async function buildV4Section(birth: {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: 'male' | 'female';
}): Promise<string> {
  try {
    const res = await fetch('/api/interpret-dataset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        gender: birth.gender,
      }),
    });
    const json = await res.json();
    if (!json.found || !Array.isArray(json.dimensions) || json.dimensions.length === 0) {
      return '';
    }
    const lines: string[] = ['**【v4.0 数据集 · 13 维原生解读】**', ''];
    for (const d of json.dimensions as { label: string; text: string }[]) {
      lines.push(`**【${d.label}】**`, '', d.text || '（该维度无内容）', '');
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

/** 命盘解读 → 紫微命书 PDF（含封面 + 13 维原生解读 + 兜底） */
export function exportChartPdf(input: PdfInput & { chart?: ZiweiChart }): Promise<void> {
  const site = siteUrl();
  let text = input.text;
  if (!text && input.chart) text = buildFallbackReading(input.chart);
  return specToPdf({
    title: '紫微命盘解读',
    subtitle: '传统紫微斗数 · 命盘原生解读',
    meta: `命主：${input.name || '—'}\n${input.birth || ''}`,
    text,
    footer:
      '本命书内容基于传统紫微斗数文化整理，仅供娱乐与自我探索参考，不构成任何人生、医疗、投资或法律决策依据。',
    site,
    filename: `紫微命书_${input.name || '命盘'}.pdf`,
  });
}

/** 年度运势报告 PDF 命书（会员专享） */
export function exportAnnualPdf(input: AnnualPdfInput): Promise<void> {
  const site = siteUrl();
  return specToPdf({
    title: `${input.year} 年度运势报告`,
    subtitle: '传统紫微斗数 · 年度运势推演',
    meta: `命主：${input.name || '—'}\n${input.birth || ''}`,
    text: input.text,
    footer:
      '本运势报告基于传统紫微斗数文化整理，仅供娱乐与自我探索参考，不构成任何人生、医疗、投资或法律决策依据。',
    site,
    filename: `年度运势报告_${input.year}_${input.name || '命盘'}.pdf`,
  });
}
