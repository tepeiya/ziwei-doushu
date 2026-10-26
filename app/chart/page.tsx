'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import StarDetailPanel from '@/components/StarDetailPanel';
import ChartActions from '@/components/ChartActions';
import PatternsCard from '@/components/PatternsCard';
import ChartSummary from '@/components/ChartSummary';
import ChartHistory, { type ChartItem } from '@/components/ChartHistory';
import TimeNav, { type TimeView } from '@/components/TimeNav';
import SiteNav from '@/components/SiteNav';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart, Palace, Star } from '@/lib/ziwei/types';

export default function ChartPage() {
  const router = useRouter();
  const { status } = useSession();
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [view, setView] = useState<TimeView>('mingpan');
  const [liunianYear, setLiunianYear] = useState(() => new Date().getFullYear());

  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [starPalaceName, setStarPalaceName] = useState<string | undefined>();
  const [selectedSiHua, setSelectedSiHua] = useState<{ starName: string; siHua: string; view: TimeView } | null>(null);

  const [savedCharts, setSavedCharts] = useState<ChartItem[]>([]);

  // 已登录时加载「我的命盘」
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/charts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.charts) setSavedCharts(d.charts); })
      .catch(() => {});
  }, [status]);

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
    } catch {
      setChart(generateChart(info)); // 服务端不可用时降级到浏览器端排盘
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setChart(null);
    setSelectedPalace(null);
    setSelectedStar(null);
    setSelectedSiHua(null);
  };

  const birthText = (() => {
    const b = chart?.birthInfo as { year?: number; month?: number; day?: number; hour?: number; gender?: string } | undefined;
    if (!b) return '';
    const h = b.hour === 0 || b.hour === 23 ? '子时' : `${b.hour ?? '?'}时`;
    return `${b.year}年${b.month}月${b.day}日 ${h} · ${b.gender === 'male' ? '男' : '女'}`;
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
          <BirthForm onSubmit={handleGenerate} loading={loading} />
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
            <TimeNav
              chart={chart}
              view={view}
              liunianYear={liunianYear}
              onViewChange={setView}
              onYearChange={setLiunianYear}
            />
            <ChartBoard
              chart={chart}
              onStarSelect={(star, palace) => { setSelectedStar(star); setStarPalaceName(palace?.name); }}
              onPalaceSelect={setSelectedPalace}
              onSiHuaClick={(starName, siHua, v) => setSelectedSiHua({ starName, siHua, view: v })}
            />
            <ChartActions chart={chart} />
            <PatternsCard chart={chart} />
            <ChartSummary chart={chart} />
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
    </div>
  );
}
