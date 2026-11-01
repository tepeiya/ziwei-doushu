'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BirthForm from '@/components/BirthForm';
// 重组件路由级代码分割：ChartBoard / InsightPanel 体积较大，按需懒加载减小首屏包体
import dynamic from 'next/dynamic';
const ChartBoard = dynamic(() => import('@/components/ChartBoard'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const InsightPanel = dynamic(() => import('@/components/InsightPanel'), {
  ssr: false,
  loading: () => <InsightSkeleton />,
});
// v4.0 数据集「原生 13 维」浏览面板：直接读取数据集原文（未润色），
// 与右侧 AI 润色版互补，方便逐个维度核对原始论断。
const DatasetInterpretation = dynamic(() => import('@/components/DatasetInterpretation'), {
  ssr: false,
});
const StarDetailPanel = dynamic(() => import('@/components/StarDetailPanel'), { ssr: false });
import ChartActions from '@/components/ChartActions';
import PatternsCard from '@/components/PatternsCard';
import ChartSummary from '@/components/ChartSummary';
import ChartViz from '@/components/ChartViz';
import ChartHistory, { type ChartItem } from '@/components/ChartHistory';
import ShareModal from '@/components/ShareModal';
import { type TimeView } from '@/components/TimeNav';
import SiteNav from '@/components/SiteNav';
import { generateChart } from '@/lib/ziwei/algorithm';
import { formatShichen } from '@/lib/ziwei/constants';
import { formToSearchParams, searchParamsToForm, formToBirthInfo } from '@/lib/ziwei/share';
import type { BirthInfo, ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import type { BirthFormState } from '@/components/BirthForm';

/** 命盘骨架屏（路由级代码分割时的占位） */
function ChartSkeleton() {
  return (
    <div className="card-glass rounded-xl p-5 animate-pulse" style={{ minHeight: 520 }}>
      <div className="h-3 w-28 rounded mb-4" style={{ background: 'var(--t-border)' }} />
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)', aspectRatio: '1 / 1' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded" style={{ background: 'var(--t-border)', opacity: 0.55 }} />
        ))}
      </div>
    </div>
  );
}

/** 解读面板骨架屏 */
function InsightSkeleton() {
  return (
    <div className="card-glass rounded-xl p-5 animate-pulse h-full" style={{ minHeight: 400 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-3 rounded-lg" style={{ height: 14 + i * 4, background: 'var(--t-border)', opacity: 0.5, width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export default function ChartPage() {
  const router = useRouter();
  const { status } = useSession();
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [starPalaceName, setStarPalaceName] = useState<string | undefined>();
  const [selectedSiHua, setSelectedSiHua] = useState<{ starName: string; siHua: string; view: TimeView } | null>(null);

  const [savedCharts, setSavedCharts] = useState<ChartItem[]>([]);

  // 分享链接：保留最近一次表单原始录入（用于拼 shareUrl 与分享卡信息）
  const [formState, setFormState] = useState<BirthFormState | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const deepLinkHandled = useRef(false);

  // 已登录时加载「我的命盘」（保存新命盘后可调用 reload 即时刷新，无需整页刷新）
  const reloadSavedCharts = useCallback(() => {
    fetch('/api/charts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.charts) setSavedCharts(d.charts); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    reloadSavedCharts();
  }, [status, reloadSavedCharts]);

  // 算完即自动保存：登录用户存入「我的命盘」，游客存入 localStorage 以便重访恢复
  const lastSavedSig = useRef<string | null>(null);
  const autoSaveChart = useCallback(async (c: ZiweiChart) => {
    const b = c.birthInfo as { year?: number; month?: number; day?: number; hour?: number; gender?: string; city?: string; province?: string } | undefined;
    const sig = [b?.year, b?.month, b?.day, b?.hour, b?.gender, b?.city ?? b?.province ?? ''].join('|');
    if (status !== 'authenticated') {
      try {
        localStorage.setItem('ziwei-last-chart', JSON.stringify({ chart: c, sig, savedAt: Date.now() }));
      } catch { /* localStorage 不可用，静默 */ }
      return;
    }
    if (sig && sig === lastSavedSig.current) return; // 同一生辰本次会话不再重复提交
    lastSavedSig.current = sig;
    try {
      const res = await fetch('/api/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: c, birthInfo: b }),
      });
      if (res.ok) reloadSavedCharts();
    } catch { /* 网络异常不影响查看命盘 */ }
  }, [status, reloadSavedCharts]);

  const handleGenerate = useCallback(async (info: BirthInfo) => {
    setLoading(true);
    setError('');
    setSelectedPalace(null);
    setSelectedStar(null);
    try {
      const res = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      if (!res.ok) throw new Error('chart api failed');
      const data = await res.json();
      setChart(data.chart);
      autoSaveChart(data.chart);
    } catch {
      // 客户端兜底：绕过 /api/chart 的缓存、限流与审计，直接在浏览器排盘。
      // 行为差异：无服务端缓存命中、不计入分布式限流、无审计日志——仅作可用性兜底。
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[chart] /api/chart 不可用，已降级到浏览器端 generateChart 兜底（绕过缓存/限流）');
      }
      const generated = generateChart(info);
      setChart(generated);
      autoSaveChart(generated);
    } finally {
      setLoading(false);
    }
  }, [autoSaveChart]);

  // 分享链接深链：/chart?y=&m=&d=&h=&mi=&p=&c=&lo=&g= → 预填表单并自动起盘
  // （用 window.location 服务端/静态期不触达，避免 useSearchParams 的 Suspense 要求）
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const parsed = searchParamsToForm(new URLSearchParams(window.location.search));
    if (!parsed || !parsed.year || !parsed.month || !parsed.day) return;
    const full = {
      name: parsed.name ?? '',
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      clockHour: parsed.clockHour ?? '8',
      clockMinute: parsed.clockMinute ?? '0',
      unknownTime: parsed.unknownTime ?? false,
      province: parsed.province ?? '',
      city: parsed.city ?? '',
      longitude: parsed.longitude ?? 120,
      gender: parsed.gender ?? 'male',
    } as BirthFormState;
    setFormState(full);
    handleGenerate(formToBirthInfo(full));
  }, [handleGenerate]);

  // 游客自动恢复：重访时直接带回上一次算完并自动保存的命盘
  // （登录用户由「我的命盘」服务端列表承载，此处跳过）
  useEffect(() => {
    if (status === 'authenticated') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('year') && params.get('month') && params.get('day')) return; // 深链优先，不覆盖
    try {
      const raw = localStorage.getItem('ziwei-last-chart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.chart) setChart(parsed.chart);
      }
    } catch { /* 解析失败则忽略，正常显示表单 */ }
  }, [status]);

  const reset = () => {
    setChart(null);
    setSelectedPalace(null);
    setSelectedStar(null);
    setSelectedSiHua(null);
  };

  const birthText = (() => {
    const b = chart?.birthInfo as { year?: number; month?: number; day?: number; hour?: number; gender?: string } | undefined;
    if (!b) return '';
    // birthInfo.hour 是时辰支索引（0=子…11=亥），不能直接当小时数显示
    return `${b.year}年${b.month}月${b.day}日 ${formatShichen(b.hour)} · ${b.gender === 'male' ? '男' : '女'}`;
  })();

  // ── 未起盘：出生信息表单 ──
  if (!chart) {
    return (
      <div className="with-tabbar min-h-screen" style={{ background: 'var(--bg-0)' }}>
        <SiteNav />
        <main className="mx-auto w-full" style={{ maxWidth: 720, padding: '32px 20px 48px' }}>
          <div className="text-center mb-8">
            <div style={{ fontSize: 30, color: 'var(--t-gold)', opacity: 0.18, marginBottom: 8 }}>☯</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--tx-0)' }}>紫微斗数排盘</h1>
            <p style={{ fontSize: 13, color: 'var(--tx-3)', marginTop: 8, lineHeight: 1.7 }}>
              输入出生年月日时，生成专属命盘，并由 AI 按传统紫微斗数体系为你深度解读
            </p>
          </div>
          <BirthForm onSubmit={handleGenerate} loading={loading} onFormSave={setFormState} />
          {error && <p className="text-center mt-4 text-sm" style={{ color: '#dc2626' }}>{error}</p>}
        </main>
      </div>
    );
  }

  // ── 已起盘：命盘工作台 ──
  return (
    <div className="with-tabbar min-h-screen flex flex-col" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      {/* 顶部工具条 */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 lg:px-6 h-12 lg:h-14 border-b"
        style={{ background: 'color-mix(in srgb, var(--bg-0) 92%, transparent)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: 'var(--bdr)' }}
      >
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[13px] shrink-0"
          style={{ color: 'var(--tx-3)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 16 }}>‹</span><span>重新起盘</span>
        </button>
        <div className="w-px h-5" style={{ background: 'var(--bdr-med)' }} />
        <span className="text-[12px] truncate" style={{ color: 'var(--ac)', letterSpacing: '0.05em' }}>{birthText}</span>
      </div>

      {/* 工作台：桌面双栏独立滚动，移动端堆叠 */}
      <div className="mx-auto w-full flex-1" style={{ maxWidth: 1360 }}>
        <div className="lg:grid lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-0">
          {/* 左栏：命盘 + 操作 + 格局 */}
          <div className="lg:border-r lg:overflow-y-auto lg:h-[calc(100vh-112px)] p-4 lg:p-5 space-y-4">
            <ChartBoard
              chart={chart}
              onStarSelect={(star, palace) => { setSelectedStar(star); setStarPalaceName(palace?.name); }}
              onPalaceSelect={setSelectedPalace}
              onPalaceDeselect={() => setSelectedPalace(null)}
              onSiHuaClick={(starName, siHua, v) => setSelectedSiHua({ starName, siHua, view: v })}
            />
            <ChartActions chart={chart} onSaved={reloadSavedCharts} onShare={() => setShareOpen(true)} />
            <PatternsCard chart={chart} />
            <ChartSummary chart={chart} />
            <ChartViz chart={chart} />
            {status === 'authenticated' && savedCharts.length > 0 && (
              <ChartHistory charts={savedCharts} />
            )}
          </div>

          {/* 右栏：AI 解读 */}
          <div className="lg:overflow-y-auto lg:h-[calc(100vh-112px)] p-4 lg:p-5" style={{ background: 'var(--bg-1)' }}>
            <div className="h-[70vh] lg:h-full">
              <InsightPanel
                chart={chart}
                selectedPalace={selectedPalace}
                selectedSiHua={selectedSiHua}
              />
            </div>

            {/* v4.0 数据集原生 13 维解读：直接读取数据集原文，与 AI 润色版互补 */}
            {chart && (
              <div className="mt-4">
                <DatasetInterpretation birth={(chart.birthInfo as BirthInfo) ?? null} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主星详情抽屉 */}
      {selectedStar && (
        <StarDetailPanel
          star={selectedStar}
          palaceName={starPalaceName}
          onClose={() => setSelectedStar(null)}
        />
      )}

      {/* 分享命盘（链接 + 朋友圈分享图） */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={(() => {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
          return formState ? `${origin}/chart?${formToSearchParams(formState).toString()}` : `${origin}/chart`;
        })()}
        chart={chart}
        birth={(() => {
          if (formState) {
            return {
              year: String(formState.year), month: String(formState.month), day: String(formState.day),
              hour: String(formState.clockHour), minute: String(formState.clockMinute),
              gender: formState.gender, city: formState.city || undefined,
            };
          }
          const b = chart.birthInfo as { year?: number; month?: number; day?: number; gender?: string } | undefined;
          return {
            year: String(b?.year ?? ''), month: String(b?.month ?? ''), day: String(b?.day ?? ''),
            hour: '', minute: '', gender: b?.gender === 'female' ? ('female' as const) : ('male' as const),
          };
        })()}
      />
    </div>
  );
}
