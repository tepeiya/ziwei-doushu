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
          <div key={i} style={{ fontSize: '13px', lineHeight: 1.75, color: 'var(--tx-2)' }}>
            {parts.map((part, j) => (j % 2 === 0 ? part : <strong key={j} style={{ fontWeight: 500, color: 'var(--tx-0)' }}>{part}</strong>))}
          </div>
        );
      })}
      {streaming && <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--ac)', opacity: 0.5, borderRadius: '2px', animation: 'pulse 1s ease-in-out infinite', verticalAlign: 'middle', marginLeft: '2px' }} />}
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

  // 用共享 validateForm 做真实校验（非法日期/越界年份/时间缺失都会拦截）
  // 注意：validateForm 合法时也返回 {year:'',month:'',day:''}（值为空串），
  // 因此必须判断「是否有非空错误值」，不能用 Object.keys().length，否则恒为不通过。
  const isFormReady = (f: BirthFormState | null): boolean => Object.values(validateForm(f)).every((v) => !v);

  async function run() {
    setErr(false);
    if (!isFormReady(form)) {
      const missing = Object.values(validateForm(form)).filter(Boolean).join('；');
      setErrMsg(`请先完善出生信息：${missing}`);
      setErr(true);
      return;
    }
    // 年份校验：空输入 Number('') 会变 0，非法年份一律拦截
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      setErr(true);
      setErrMsg('请输入 1900–2100 之间的报告年份');
      return;
    }
    setAnalyzing(true);
    setAnalysis('');
    try {
      // 闭包中的 chart 仍是旧值，统一用本地变量，避免同步重复 buildChart
      const c = chart ?? buildChart(formToBirthInfo(form!));
      if (!chart) setChart(c);
      const res = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: c, year }),
      });
      // 付费墙：试用次数用尽（与 AI 解读共用额度）
      if (res.status === 402) { setPaywall(true); return; }
      if (!res.ok) {
        // 透传服务端真实原因（如 429 限流），避免一律显示「服务不可用」
        let msg = `生成失败（HTTP ${res.status}）`;
        try {
          const raw = await res.text();
          try {
            const j = JSON.parse(raw);
            if (j && typeof j.error === 'string' && j.error) msg = j.error;
          } catch {
            const t = raw?.trim();
            if (t && t.length > 0 && t.length < 120) msg = t;
          }
        } catch { /* 读取失败则用默认文案 */ }
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

  // 会员校验后导出：未登录→登录页；非会员→定价页；会员→下载 PDF
  async function handleExport() {
    if (!analysis) { setExportHint('请先生成运势解读'); setTimeout(() => setExportHint(''), 2500); return; }
    setExporting(true);
    try {
      const res = await fetch('/api/charts');
      if (res.status === 401) { router.push('/login?redirect=/annual'); return; }
      const data = await res.json();
      if (!data.isMember) {
        router.push('/pricing');
        return;
      }
      const { name, birth } = birthText();
      exportAnnualPdf({ name, birth, year, text: analysis });
    } catch {
      setExportHint('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }

  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(200,160,60,0.2)'}`,
    borderRadius: '16px', padding: '24px',
  };
  const labelStyle = { fontSize: '10px', letterSpacing: '0.4em', color: 'var(--ac)', opacity: 0.7, marginBottom: '16px', display: 'block' as const };

  return (
    <>
      <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <SiteNav />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', color: 'var(--ac)', opacity: 0.15, marginBottom: '12px' }}>📜</div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--tx-0)', marginBottom: '8px' }}>年度运势报告</h1>
          <p style={{ fontSize: '13px', color: 'var(--tx-3)', lineHeight: 1.6 }}>AI 基于命盘与流年飞星，生成可下载的年度运势 PDF 命书（会员专享）</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <span style={labelStyle}>出生信息</span>
          <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setForm} />
          <p style={{ marginTop: '10px', fontSize: '11px', color: 'var(--tx-3)', textAlign: 'center' }}>
            会自动带入上次填写或最近保存的命盘档案；如无记录按提示填写一次即可，之后无需重填
          </p>
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <span style={labelStyle}>报告年份</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="number" value={year} min={1900} max={2100} onChange={(e) => setYear(Number(e.target.value))} className="input-base" style={{ fontSize: '14px', width: '140px' }} />
            <button onClick={run} disabled={analyzing} style={{ padding: '10px 28px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8', fontSize: '14px', fontWeight: 600, letterSpacing: '0.15em', cursor: analyzing ? 'not-allowed' : 'pointer', opacity: analyzing ? 0.6 : 1 }}>
              {analyzing ? '生成中…' : '生成报告'}
            </button>
          </div>
          {err && <div style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>{errMsg || '请先填写完整出生信息'}</div>}
        </div>

        <div ref={analysisRef} style={{ ...cardStyle, minHeight: '220px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: analysis || analyzing ? '20px' : '0' }}>
            <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'var(--tx-3)' }}>年度运势 · {year}</span>
          </div>
          {!analysis && !analyzing && <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '13px', color: 'var(--tx-3)' }}>填写信息并选择年份后，点击「生成报告」</div>}
          {analyzing && !analysis && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px 0', color: 'var(--tx-3)', fontSize: '13px' }}><div style={{ width: '14px', height: '14px', border: '2px solid var(--bdr-med)', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />正在生成年度运势…</div>}
          {analysis && <AiContent text={analysis} streaming={analyzing} />}
        </div>

        {analysis && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button onClick={handleExport} disabled={exporting} style={{ padding: '12px 32px', borderRadius: 'var(--r-pill)', border: '1px solid var(--bdr-med)', background: 'transparent', color: 'var(--ac)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.12em', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1 }}>
              {exporting ? '导出中…' : '下载年度运势 PDF 命书'}
            </button>
            <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--tx-3)', lineHeight: 1.6 }}>
              PDF 命书为会员权益。未登录将跳转登录，非会员可前往开通会员后下载。
            </p>
            {exportHint && <p style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{exportHint}</p>}
          </div>
        )}
      </div>
      </div>

      {/* ── 付费墙弹窗（试用次数用尽，年度运势与解读共用额度）── */}
      {paywall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,6,4,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setPaywall(false)}
        >
          <div
            className="w-full max-w-[380px] rounded-2xl p-6 text-center"
            style={{ background: 'var(--bg-0)', border: '1px solid rgba(212,168,67,0.35)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '28px', marginBottom: 12, color: 'var(--ac)' }}>🔒</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--tx-0)' }}>免费试用已用完</h3>
            <p style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 20, color: 'var(--tx-2)' }}>
              您已用完免费 AI 解读次数（年度运势与命盘解读共用额度）。开通会员即可无限次生成年度运势、合盘与命书导出。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="/pricing" onClick={() => setPaywall(false)} style={{ display: 'block', padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,#9a6210,#c88020)', color: '#fff8e8' }}>开通会员</a>
              <a href="/login?redirect=/annual" onClick={() => setPaywall(false)} style={{ display: 'block', padding: '10px 0', borderRadius: 10, fontSize: 13, border: '1px solid var(--bdr-med)', color: 'var(--tx-2)' }}>登录账号</a>
              <button onClick={() => setPaywall(false)} style={{ padding: '8px 0', fontSize: 12, color: 'var(--tx-3)' }}>稍后再说</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
