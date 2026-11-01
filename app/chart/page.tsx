'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import SiteNav from '@/components/SiteNav';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/components/ThemeProvider';

type ChartData = {
  chart: ZiweiChart;
  charts: any[];
  used: number | null;
  total: number | null;
  isPremium: boolean;
};

async function fetchChartData(info: BirthInfo): Promise<ChartData> {
  const [chartRes, usageRes] = await Promise.all([
    fetch('/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    }),
    fetch('/api/usage', { cache: 'no-store' }),
  ]);
  if (!chartRes.ok) throw new Error('chart-failed');
  const chart = (await chartRes.json()).chart as ZiweiChart;

  let used: number | null = null;
  let total: number | null = null;
  let isPremium = false;
  if (usageRes.ok) {
    const u = await usageRes.json();
    used = u.used ?? null;
    total = u.total ?? null;
    isPremium = !!u.isPremium;
  }
  const charts = (chart as any).charts ?? [];
  return { chart, charts, used, total, isPremium };
}

function useChart(info: BirthInfo | null) {
  const [state, setState] = useState<{
    data: ChartData | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!info) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchChartData(info)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: '排盘失败，请稍后重试' });
      });
    return () => {
      cancelled = true;
    };
  }, [info]);

  return state;
}

// 排盘可视化（保留原逻辑）
function ChartView({ chart }: { chart: ZiweiChart }) {
  return <ChartBoard chart={chart} />;
}

// 存档弹窗（保留原逻辑）
function SaveChartModal({
  open, onClose, onSave, title, setTitle, loading,
}: {
  open: boolean; onClose: () => void; onSave: () => void;
  title: string; setTitle: (v: string) => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="mv-modal-mask" onClick={onClose}>
      <div className="mv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal-emoji">💾</div>
        <div className="mv-modal-title">保存命盘</div>
        <div className="mv-modal-body">为这份命盘起个名字，便于在「我的命盘」中找回。</div>
        <input
          className="mv-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：我的本命盘"
        />
        <div className="mv-modal-actions" style={{ marginTop: 16 }}>
          <button className="mv-btn mv-btn-primary" onClick={onSave} disabled={loading}>
            {loading ? '保存中…' : '保存'}
          </button>
          <button className="mv-btn mv-btn-ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

// 分页历史（保留原逻辑，移动化展示）
function PaginatedHistory({
  items, onLoad, resetKey, onRestore,
}: {
  items: any[]; onLoad: () => void; resetKey: number; onRestore: (c: any) => void;
}) {
  const [local, setLocal] = useState<any[]>(items);
  useEffect(() => setLocal(items), [items, resetKey]);
  if (!local.length) return null;
  return (
    <div className="mv-card-flat">
      <div className="mv-section-title" style={{ margin: '0 0 12px' }}>我的命盘</div>
      <div className="flex flex-col gap-2">
        {local.map((c) => (
          <div key={c.id} className="mv-row">
            <div className="min-w-0">
              <div className="text-[13px]" style={{ color: 'var(--tx-0)' }}>{c.title || '未命名命盘'}</div>
              <div className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                {c.birth_info?.name || '匿名'} · {c.birth_info?.year}年{c.birth_info?.month}月
              </div>
            </div>
            <button className="mv-chip" onClick={() => onRestore(c)}>载入</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const FREE_LIMIT = 3;

export default function ChartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [form, setForm] = useState<BirthFormState | null>(null);
  const [info, setInfo] = useState<BirthInfo | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [histReset, setHistReset] = useState(0);
  const restoredChart = useRef<ZiweiChart | null>(null);

  const { data, loading, error } = useChart(info);
  const chart = useMemo(() => data?.chart ?? restoredChart.current, [data]);
  const charts = useMemo(() => data?.charts ?? [], [data]);
  const used = data?.used ?? null;
  const total = data?.total ?? null;
  const isPremium = data?.isPremium ?? false;

  const onFormReady = useCallback((info: BirthInfo) => {
    setInfo(info);
  }, []);

  const handleSaveInit = useCallback(() => {
    if (!chart) return;
    let base = (form?.name as string) || (form as any)?.name || '';
    if ((form as any)?.name) base = (form as any).name;
    setSaveTitle(base ? `${base}的命盘` : '我的命盘');
    setSaveOpen(true);
  }, [chart, form]);

  const handleSave = useCallback(async () => {
    if (!chart) return;
    setSaving(true);
    try {
      const res = await fetch('/api/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveTitle || '我的命盘',
          visibility: 'private',
          birth_info: formToBirthInfo(form!),
          chart,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setSavedId(json?.id ?? 'saved');
        setHistReset((n) => n + 1);
      }
    } finally {
      setSaving(false);
      setSaveOpen(false);
    }
  }, [chart, saveTitle, form]);

  const handleRestore = useCallback((c: any) => {
    restoredChart.current = c.chart;
    setForm((prev) => ({ ...(prev as any), name: c.birth_info?.name ?? '' }));
    setInfo(c.birth_info);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const quotaLeft = total != null ? (isPremium ? '∞' : Math.max(0, (total ?? 0) - (used ?? 0))) : null;
  const overLimit = !isPremium && used != null && total != null && used >= total;

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      {/* 配额 / 登录提示条 */}
      {status === 'unauthenticated' && (
        <div className="mv-quota">
          <span>登录后保存命盘 · 查看解读记录</span>
          <Link href="/login">去登录 →</Link>
        </div>
      )}
      {status === 'authenticated' && !isPremium && quotaLeft != null && (
        <div className="mv-quota">
          <span>本月免费排盘剩余 {quotaLeft} 次</span>
          <Link href="/pricing">升级会员 →</Link>
        </div>
      )}

      {/* HERO */}
      <div className="mv-hero">
        <div className="mv-mark-lg">☯</div>
        <span className="mv-eyebrow">ZI WEI · 排盘</span>
        <h1 className="mv-h1">起一盘<br />读懂你的命</h1>
        <p className="mv-sub">输入出生信息，一键生成传统正宗紫微斗数命盘，并由 AI 按古籍体系为你解读。</p>
      </div>

      {/* 出生表单 */}
      <div className="mv-card mv-card-glow mv-rise mv-rise-1">
        <span className="mv-label">出生信息</span>
        <BirthForm onSubmit={onFormReady} onFormSave={setForm} autoRestore={false} />
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</div>}
      </div>

      {/* 排盘结果 */}
      {loading && (
        <div className="mv-loading"><span className="mv-spinner" />正在排盘…</div>
      )}

      {chart && !loading && (
        <>
          <div className="mv-section-title mv-rise mv-rise-2">命盘全景</div>
          <div className="mv-card mv-rise mv-rise-2">
            <ChartView chart={chart} />
          </div>

          {/* 操作区 */}
          <div className="mv-rise mv-rise-3">
            {status === 'authenticated' && !savedId && (
              <button className="mv-btn mv-btn-ghost mv-btn-block" onClick={handleSaveInit}>保存命盘</button>
            )}
            {savedId && (
              <div className="mv-quota" style={{ justifyContent: 'center', color: 'var(--ac)' }}>
                已保存到「我的命盘」
              </div>
            )}
          </div>

          {/* AI 解读 */}
          <div className="mv-section-title mv-rise mv-rise-3">
            紫微 AI 解读
            {overLimit && <Link href="/pricing" className="mv-chip mv-chip-active" style={{ marginLeft: 'auto' }}>额度用完 · 升级</Link>}
          </div>
          <div className="mv-reader mv-rise mv-rise-4">
            <InsightPanel chart={chart} />
          </div>

          <PaginatedHistory
            items={charts}
            onLoad={() => {}}
            resetKey={histReset}
            onRestore={handleRestore}
          />
        </>
      )}

      {!chart && !loading && (
        <div className="mv-reader-empty mv-rise">
          <div style={{ fontSize: 30, marginBottom: 10 }}>✦</div>
          填好上方出生信息，<br />命盘与 AI 解读将在这里展开。
        </div>
      )}

      <SaveChartModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSave}
        title={saveTitle}
        setTitle={setSaveTitle}
        loading={saving}
      />
    </div>
  );
}
