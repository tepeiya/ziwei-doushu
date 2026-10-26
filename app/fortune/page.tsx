'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { generateChart as buildChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import { useTheme } from '@/components/ThemeProvider';
import SiteNav from '@/components/SiteNav';

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
          <div key={i} style={{ fontSize: '13px', lineHeight: 1.75, color: 'var(--tx-2)' }}>
            {parts.map((part, j) => (j % 2 === 0 ? part : <strong key={j} style={{ fontWeight: 500, color: 'var(--tx-0)' }}>{part}</strong>))}
          </div>
        );
      })}
      {streaming && <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--ac)', opacity: 0.5, borderRadius: '2px', animation: 'pulse 1s ease-in-out infinite', verticalAlign: 'middle', marginLeft: '2px' }} />}
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
  const [apiMissing, setApiMissing] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const isFormReady = (f: BirthFormState | null): boolean =>
    !!(f && f.year && f.month && f.day && f.gender && (f.unknownTime || (f.clockHour !== '' && f.clockMinute !== '')));

  async function run() {
    setErr(false);
    if (!isFormReady(form)) { setErr(true); return; }
    setAnalyzing(true);
    setAnalysis('');
    try {
      if (!chart) {
        const c = buildChart(formToBirthInfo(form!));
        setChart(c);
      }
      const res = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: chart ?? buildChart(formToBirthInfo(form!)), year }),
      });
      if (res.status === 404) { setApiMissing(true); throw new Error('api-missing'); }
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try { text += JSON.parse(data).delta?.text ?? ''; setAnalysis(text); } catch { /* skip */ }
        }
      }
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setErr(true);
    } finally {
      setAnalyzing(false);
    }
  }

  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(200,160,60,0.2)'}`,
    borderRadius: '16px', padding: '24px',
  };
  const labelStyle = { fontSize: '10px', letterSpacing: '0.4em', color: 'var(--ac)', opacity: 0.7, marginBottom: '16px', display: 'block' as const };

  return (
    <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <SiteNav />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', color: 'var(--ac)', opacity: 0.15, marginBottom: '12px' }}>☯</div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--tx-0)', marginBottom: '8px' }}>流年运势分析</h1>
          <p style={{ fontSize: '13px', color: 'var(--tx-3)', lineHeight: 1.6 }}>输入出生信息并选择年份，AI 基于命盘分析该年事业、财运、感情与健康的整体走势</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <span style={labelStyle}>出生信息</span>
          <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setForm} />
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <span style={labelStyle}>分析年份</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-base" style={{ fontSize: '14px', width: '140px' }} />
            <button onClick={run} disabled={analyzing} style={{ padding: '10px 28px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8', fontSize: '14px', fontWeight: 600, letterSpacing: '0.15em', cursor: analyzing ? 'not-allowed' : 'pointer', opacity: analyzing ? 0.6 : 1 }}>
              {analyzing ? '分析中…' : '开始分析'}
            </button>
          </div>
          {err && !apiMissing && <div style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>请先填写完整出生信息</div>}
        </div>

        <div ref={analysisRef} style={{ ...cardStyle, minHeight: '220px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: analysis || analyzing ? '20px' : '0' }}>
            <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'var(--tx-3)' }}>流年分析 · {year}</span>
          </div>
          {!analysis && !analyzing && <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '13px', color: 'var(--tx-3)' }}>填写信息并选择年份后，点击「开始分析」</div>}
          {analyzing && !analysis && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px 0', color: 'var(--tx-3)', fontSize: '13px' }}><div style={{ width: '14px', height: '14px', border: '2px solid var(--bdr-med)', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />正在分析流年运势…</div>}
          {analysis && <AiContent text={analysis} streaming={analyzing} />}
          {err && apiMissing && <div style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--bdr)', background: 'var(--bg-card)', fontSize: '13px', color: 'var(--tx-2)', marginTop: '12px' }}>AI 流年服务暂未配置（/api/fortune），请稍后重试。</div>}
          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <div style={{ ...cardStyle, display: 'inline-block', maxWidth: 560, textAlign: 'left' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--tx-0)', marginBottom: '6px' }}>想要可下载的年度运势 PDF 命书？</div>
              <div style={{ fontSize: '13px', color: 'var(--tx-3)', lineHeight: 1.6, marginBottom: '14px' }}>前往「年度运势报告」，生成完整年度解读并导出会员专享 PDF 命书。</div>
              <button onClick={() => router.push('/annual')} style={{ padding: '10px 26px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>前往年度运势报告 →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
