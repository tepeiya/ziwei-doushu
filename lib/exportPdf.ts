// lib/exportPdf.ts
// 前端 PDF 命书导出（jsPDF）。仅在浏览器端调用。

import { jsPDF } from 'jspdf';

export interface PdfInput {
  name?: string;
  birth?: string;
  text: string; // 解读正文（Markdown 简化：按换行分段，*加粗* 转为纯文本）
}

function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1') // **粗体** -> 文本
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s*/gm, '');
}

export function exportChartPdf({ name, birth, text }: PdfInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  doc.setFontSize(20);
  doc.text('紫微命盘解读', margin, y);
  y += 24;

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`命主：${name || '—'}    ${birth || ''}`, margin, y);
  y += 18;

  doc.setDrawColor(210, 180, 120);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  doc.setTextColor(20);
  doc.setFontSize(10.5);

  const plain = stripMd(text);
  const paragraphs = plain.split('\n').filter((p) => p.trim().length > 0);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, pageW - margin * 2);
    if (y + lines.length * 15 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 15;
    }
    y += 6;
  }

  // 页脚免责
  doc.setFontSize(8.5);
  doc.setTextColor(140);
  doc.text(
    '本命书内容基于传统紫微斗数文化整理，仅供娱乐与自我探索参考，不构成任何人生、医疗、投资或法律决策依据。',
    margin,
    doc.internal.pageSize.getHeight() - 28,
    { maxWidth: pageW - margin * 2 },
  );

  doc.save(`紫微命书_${name || '命盘'}.pdf`);
}

export interface AnnualPdfInput {
  name?: string;
  birth?: string;
  year: number;
  text: string; // 解读正文（Markdown 简化）
}

/**
 * 年度运势报告 PDF 命书（高价增值项）。
 * 标题带年份，正文分页，末页页脚加娱乐参考免责。
 */
export function exportAnnualPdf({ name, birth, year, text }: AnnualPdfInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 56;

  doc.setFontSize(22);
  doc.setTextColor(120, 80, 20);
  doc.text(`${year} 年度运势报告`, margin, y);
  y += 26;

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`命主：${name || '—'}    ${birth || ''}`, margin, y);
  y += 18;

  doc.setDrawColor(210, 180, 120);
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  doc.setTextColor(20);
  doc.setFontSize(10.5);

  const plain = stripMd(text);
  const paragraphs = plain.split('\n').filter((p) => p.trim().length > 0);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, pageW - margin * 2);
    if (y + lines.length * 15 > pageH - margin - 18) {
      doc.addPage();
      y = margin;
    }
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 15;
    }
    y += 6;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(140);
  doc.text(
    '本运势报告基于传统紫微斗数文化整理，仅供娱乐与自我探索参考，不构成任何人生、医疗、投资或法律决策依据。',
    margin,
    pageH - 28,
    { maxWidth: pageW - margin * 2 },
  );

  doc.save(`年度运势报告_${year}_${name || '命盘'}.pdf`);
}
