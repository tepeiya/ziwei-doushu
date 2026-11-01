'use client';
import { useState, useCallback, useRef } from 'react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (sectionMatch) {
          return (
            <div key={i} style={{ paddingTop: i === 0 ? 0 : 14, paddingBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ac)', letterSpacing: '0.04em' }}>【{sectionMatch[1]}】</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.78, color: 'var(--tx-2)' }}>
            {parts.map((p, j) => (j % 2 === 0 ? p : <strong key={j} style={{ fontWeight: 500, color: 'var(--tx-0)' }}>{p}</strong>))}
          </div>
        );
      })}
      {streaming && <span style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--ac)', opacity: 0.5, borderRadius: 2, animation: 'pulse 1s ease-in-out infinite', verticalAlign: 'middle', marginLeft: 2 }} />}
    </div>
  );
}

export default function HemingPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [chartA, setChartA] = useState<ZiweiChart | null>(null);
  const [chartB, setChartB] = useState<ZiweiChart | null>(null);
  const [formA, setFormA] = useState<BirthFormState | null>(null);
  const [formB, setFormB] = useState<BirthFormState | null>(null);

  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [analysisError, setAnalysisError] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const generateChart = useCallback(async (info: BirthInfo): Promise<ZiweiChart | null> => {
    try { return buildChart(info); } catch { return null; }
  }, []);

  const isFormReady = (f: BirthFormState | null): boolean => Object.values(validateForm(f)).every((v) => !v);

  const runAnalysis = useCallback(async (q?: string) => {
    setFormError(null);
    if (!isFormReady(formA) || !isFormReady(formB)) {
      setFormError('请先填写双方完整出生信息');
      return;
    }
    setAnalyzing(true);
    setAnalysis('');
    setAnalysisError(false);

    try {
      let cA = chartA;
      let cB = chartB;
      const [newA, newB] = await Promise.all([
        cA ? Promise.resolve(cA) : generateChart(formToBirthInfo(formA!)),
        cB ? Promise.resolve(cB) : generateChart(formToBirthInfo(formB!)),
      ]);
      cA = newA; cB = newB;
      if (!cA || !cB) { setAnalysisError(true); setAnalyzing(false); return; }
      if (!chartA) setChartA(cA);
      if (!chartB) setChartB(cB);

      const res = await fetch('/api/heming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartA: cA, chartB: cB, question: q ?? undefined }),
      });
      if (res.status === 404) { setApiMissing(true); throw new Error('api-missing'); }
      if (!res.ok || !res.body) throw new Error();

      let text = '';
      await readSseStream(res.body, (data) => {
        if (data === '[DONE]') return;
        try { const delta = JSON.parse(data).delta?.text ?? ''; text += delta; setAnalysis(text); } catch { /* skip */ }
      });
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setAnalysisError(true);
    } finally {
      setAnalyzing(false);
    }
  }, [chartA, chartB, formA, formB, generateChart]);

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">☯</div>
        <span className="mv-eyebrow">COMPATIBILITY</span>
        <h1 className="mv-h1">紫微合盘</h1>
        <p className="mv-sub">输入两个人出生信息，AI 基于传统体系分析缘分匹配度、相处建议。</p>
      </div>

      <div className="mv-card">
        <span className="mv-label">甲方 — A</span>
        <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormA} storageKey="heming-a" autoRestore={false} />
      </div>
      <div className="mv-card">
        <span className="mv-label">乙方 — B</span>
        <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormB} storageKey="heming-b" autoRestore={false} />
      </div>

      {formError && <div style={{ padding: '0 16px 4px', color: '#dc2626', fontSize: 13 }}>{formError}</div>}

      <div ref={analysisRef} className="mv-reader">
        <div className="mv-row" style={{ marginBottom: (analysis || analyzing) ? 18 : 0 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
            <span style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--tx-3)' }}>合盘分析 · HEMING</span>
          </div>
        </div>
        {!analysis && !analyzing && <div className="mv-reader-empty">填好双方出生信息后，点击下方按钮<br />AI 将深度分析两人缘分匹配度</div>}
        {analyzing && !analysis && <div className="mv-loading"><span className="mv-spinner" />正在对比双方命盘…</div>}
        {analysis && <AiContent text={analysis} streaming={analyzing} />}
        {analysisError && (
          <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--bg-card)', fontSize: 13, color: 'var(--tx-2)', marginTop: 12 }}>
            {apiMissing
              ? 'AI 合盘服务暂未配置（/api/heming），请稍后重试。两人的命盘可分别到「排盘」页查看。'
              : '分析暂时不可用，请重试。'}
          </div>
        )}
      </div>

      {!analyzing && (
        <button className="mv-btn mv-btn-primary mv-btn-block" onClick={() => runAnalysis()} disabled={analyzing}>
          开始合盘分析
        </button>
      )}

      {analysis && (
        <div className="mv-card-flat">
          <div className="mv-label" style={{ marginBottom: 10 }}>针对此次合盘继续追问</div>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
            {['感情匹配度如何？', '适合合伙创业吗？', '两人结婚是否合适？', '哪方面最容易产生矛盾？', '财运是否互补？'].map((q) => (
              <button key={q} className="mv-chip" onClick={() => { setQuestion(q); runAnalysis(q); }}>{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="mv-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runAnalysis(question || undefined); }}
              placeholder="继续追问，如：哪几年是两人感情关键期？"
            />
            <button className="mv-btn mv-btn-ghost" style={{ width: 'auto', padding: '0 18px' }} onClick={() => runAnalysis(question || undefined)}>追问</button>
          </div>
        </div>
      )}
    </div>
  );
}
