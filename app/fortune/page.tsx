'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BirthForm, { validateForm, type BirthFormState } from '@/components/BirthForm';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { generateChart as buildChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
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
            {parts.map((part, j) => (j % 2 === 0 ? part : <strong key={j} style={{ fontWeight: 500, color: 'var(--tx-0)' }}>{part}</strong>))}
          </div>
        );
      })}
      {streaming && <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--ac)', opacity: 0.5, borderRadius: 2, animation: 'pulse 1s ease-in-out infinite', verticalAlign: 'middle', marginLeft: 2 }} />}
    </div>
  );
}

export default function FortunePage() {
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
  const [apiMissing, setApiMissing] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const isFormReady = (f: BirthFormState | null): boolean => Object.values(validateForm(f)).every((v) => !v);

  async function run() {
    setErr(false);
    setApiMissing(false);
    if (!isFormReady(form)) {
      const missing = Object.values(validateForm(form)).filter(Boolean).join('；');
      setErrMsg(`请先完善出生信息：${missing}`);
      setErr(true);
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      setErr(true);
      setErrMsg('请输入 1900–2100 之间的分析年份');
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
      if (res.status === 404) { setApiMissing(true); throw new Error('api-missing'); }
      if (!res.ok || !res.body) throw new Error();
      let text = '';
      await readSseStream(res.body, (data) => {
        if (data === '[DONE]') return;
        try { text += JSON.parse(data).delta?.text ?? ''; setAnalysis(text); } catch { /* skip */ }
      });
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      if (e instanceof Error && e.message !== 'api-missing') setErrMsg('解读服务暂时不可用，请稍后重试');
      setErr(true);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">☯</div>
        <span className="mv-eyebrow">FORTUNE</span>
        <h1 className="mv-h1">流年运势分析</h1>
        <p className="mv-sub">输入出生信息并选择年份，AI 基于命盘分析该年事业、财运、感情与健康的整体走势。</p>
      </div>

      <div className="mv-card mv-card-glow">
        <span className="mv-label">出生信息</span>
        <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setForm} />
        <p style={{ marginTop: 10, fontSize: 11, color: 'var(--tx-3)', textAlign: 'center' }}>
          会自动带入上次填写或最近保存的命盘档案；如无记录按提示填写一次即可。
        </p>
      </div>

      <div className="mv-card">
        <span className="mv-label">分析年份</span>
        <div className="flex gap-3 items-center flex-wrap">
          <input type="number" value={year} min={1900} max={2100} onChange={(e) => setYear(Number(e.target.value))} className="mv-input" style={{ width: 140, flex: 'none' }} />
          <button onClick={run} disabled={analyzing} className="mv-btn mv-btn-primary" style={{ width: 'auto', height: 44, padding: '0 24px', flex: 1 }}>
            {analyzing ? '分析中…' : '开始分析'}
          </button>
        </div>
        {err && !apiMissing && <div style={{ marginTop: 12, fontSize: 13, color: '#dc2626' }}>{errMsg || '请先填写完整出生信息'}</div>}
      </div>

      <div ref={analysisRef} className="mv-reader">
        <div className="mv-row" style={{ marginBottom: analysis || analyzing ? 18 : 0 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
            <span style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--tx-3)' }}>流年分析 · {year}</span>
          </div>
        </div>
        {!analysis && !analyzing && <div className="mv-reader-empty">填写信息并选择年份后，点击「开始分析」</div>}
        {analyzing && !analysis && <div className="mv-loading"><span className="mv-spinner" />正在分析流年运势…</div>}
        {analysis && <AiContent text={analysis} streaming={analyzing} />}
        {err && apiMissing && <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--bg-card)', fontSize: 13, color: 'var(--tx-2)', marginTop: 12 }}>AI 流年服务暂未配置（/api/fortune），请稍后重试。</div>}
        <div style={{ marginTop: 24 }}>
          <div className="mv-card-flat">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx-0)', marginBottom: 6 }}>想要可下载的年度运势 PDF 命书？</div>
            <div style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.6, marginBottom: 12 }}>前往「年度运势报告」，生成完整年度解读并导出会员专享 PDF 命书。</div>
            <button onClick={() => router.push('/annual')} className="mv-btn mv-btn-ghost">前往年度运势报告 →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
