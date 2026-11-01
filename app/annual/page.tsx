'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BirthForm, { validateForm, type BirthFormState } from '@/components/BirthForm';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { generateChart as buildChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import { exportAnnualPdf } from '@/lib/exportPdf';
import { useTheme } from '@/components/ThemeProvider';
import SiteNav from '@/components/SiteNav';
import { readSseStream } from '@/lib/sse-client';

function AiContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {lines.map((line, i) => {
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (sectionMatch) {
          return (
            <div key={i} style={{ paddingTop: i === 0 ? 0 : '14px', paddingBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ac)', letterSpacing: '0.04em' }}>【{sectionMatch[1]}】</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: '4px' }} />;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <div key={i} style={{ fontSize: '13px', lineHeight: 1.78, color: 'var(--tx-2)' }}>
            {parts.map((p, j) => (j % 2 === 0 ? p : <strong key={j} style={{ fontWeight: 500, color: 'var(--tx-0)' }}>{p}</strong>))}
          </div>
        );
      })}
      {streaming && <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--ac)', opacity: 0.5, borderRadius: 2, animation: 'pulse 1s ease-in-out infinite', verticalAlign: 'middle', marginLeft: 2 }} />}
    </div>
  );
}

export default function AnnualReportPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [form, setForm] = useState<BirthFormState | null>(null);
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportHint, setExportHint] = useState('');
  const [paywall, setPaywall] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const isFormReady = (f: BirthFormState | null): boolean => Object.values(validateForm(f)).every((v) => !v);

  async function run() {
    setErr(false);
    if (!isFormReady(form)) {
      const missing = Object.values(validateForm(form)).filter(Boolean).join('；');
      setErrMsg(`请先完善出生信息：${missing}`);
      setErr(true);
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      setErr(true);
      setErrMsg('请输入 1900–2100 之间的报告年份');
      return;
    }
    setAnalyzing(true);
    setAnalysis('');
    try {
      const c = chart ?? buildChart(formToBirthInfo(form!));
      if (!chart) setChart(c);
      const res = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: c, year }),
      });
      if (res.status === 402) { setPaywall(true); return; }
      if (!res.ok) {
        let msg = `生成失败（HTTP ${res.status}）`;
        try {
          const raw = await res.text();
          try { const j = JSON.parse(raw); if (j && typeof j.error === 'string' && j.error) msg = j.error; }
          catch { const t = raw?.trim(); if (t && t.length > 0 && t.length < 120) msg = t; }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (!res.body) throw new Error('无响应流');
      let text = '';
      await readSseStream(res.body, (data) => {
        if (data === '[DONE]') return;
        try { text += JSON.parse(data).delta?.text ?? ''; setAnalysis(text); } catch { /* skip */ }
      });
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      const msg = e instanceof TypeError
        ? '网络连接失败，请检查网络后重试'
        : (e as Error)?.message || '解读服务暂时不可用，请稍后重试';
      setErrMsg(msg);
      setErr(true);
    } finally {
      setAnalyzing(false);
    }
  }

  function birthText(): { name: string; birth: string } {
    const bi = form ? formToBirthInfo(form) : ({} as BirthInfo);
    const b = `${bi.year ?? ''}年${bi.month ?? ''}月${bi.day ?? ''}日 ${bi.gender === 'female' ? '女' : '男'}`;
    return { name: bi.name || '', birth: b };
  }

  async function handleExport() {
    if (!analysis) { setExportHint('请先生成运势解读'); setTimeout(() => setExportHint(''), 2500); return; }
    setExporting(true);
    try {
      const res = await fetch('/api/charts');
      if (res.status === 401) { router.push('/login?redirect=/annual'); return; }
      const data = await res.json();
      if (!data.isMember) { router.push('/pricing'); return; }
      const { name, birth } = birthText();
      exportAnnualPdf({ name, birth, year, text: analysis });
    } catch {
      setExportHint('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">📜</div>
        <span className="mv-eyebrow">ANNUAL REPORT</span>
        <h1 className="mv-h1">年度运势报告</h1>
        <p className="mv-sub">AI 基于命盘与流年飞星，生成可下载的年度运势 PDF 命书（会员专享）。</p>
      </div>

      <div className="mv-card mv-card-glow">
        <span className="mv-label">出生信息</span>
        <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setForm} />
        <p style={{ marginTop: 10, fontSize: 11, color: 'var(--tx-3)', textAlign: 'center' }}>
          会自动带入上次填写或最近保存的命盘档案；如无记录按提示填写一次即可。
        </p>
      </div>

      <div className="mv-card">
        <span className="mv-label">报告年份</span>
        <div className="flex gap-3 items-center flex-wrap">
          <input type="number" value={year} min={1900} max={2100} onChange={(e) => setYear(Number(e.target.value))} className="mv-input" style={{ width: 140, flex: 'none' }} />
          <button onClick={run} disabled={analyzing} className="mv-btn mv-btn-primary" style={{ width: 'auto', height: 44, padding: '0 24px', flex: 1 }}>
            {analyzing ? '生成中…' : '生成报告'}
          </button>
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 13, color: '#dc2626' }}>{errMsg || '请先填写完整出生信息'}</div>}
      </div>

      <div ref={analysisRef} className="mv-reader">
        <div className="mv-row" style={{ marginBottom: analysis || analyzing ? 18 : 0 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
            <span style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--tx-3)' }}>年度运势 · {year}</span>
          </div>
        </div>
        {!analysis && !analyzing && <div className="mv-reader-empty">填写信息并选择年份后，点击「生成报告」</div>}
        {analyzing && !analysis && <div className="mv-loading"><span className="mv-spinner" />正在生成年度运势…</div>}
        {analysis && <AiContent text={analysis} streaming={analyzing} />}
      </div>

      {analysis && (
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={handleExport} disabled={exporting} className="mv-btn mv-btn-ghost">
            {exporting ? '导出中…' : '下载年度运势 PDF 命书'}
          </button>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.6, textAlign: 'center' }}>
            PDF 命书为会员权益。未登录将跳转登录，非会员可前往开通会员后下载。
          </p>
          {exportHint && <p style={{ marginTop: 8, fontSize: 12, color: '#dc2626', textAlign: 'center' }}>{exportHint}</p>}
        </div>
      )}

      {/* 付费墙弹窗 */}
      {paywall && (
        <div className="mv-modal-mask" onClick={() => setPaywall(false)}>
          <div className="mv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-emoji">🔒</div>
            <div className="mv-modal-title">免费试用已用完</div>
            <div className="mv-modal-body">您已用完免费 AI 解读次数（年度运势与命盘解读共用额度）。开通会员即可无限次生成年度运势、合盘与命书导出。</div>
            <div className="mv-modal-actions">
              <a href="/pricing" onClick={() => setPaywall(false)} className="mv-btn mv-btn-primary" style={{ textDecoration: 'none' }}>开通会员</a>
              <a href="/login?redirect=/annual" onClick={() => setPaywall(false)} className="mv-btn mv-btn-ghost" style={{ textDecoration: 'none' }}>登录账号</a>
              <button onClick={() => setPaywall(false)} className="mv-btn mv-btn-ghost">稍后再说</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
