'use client';
import { motion } from 'framer-motion';
import { STAR_DESCRIPTIONS } from '@/lib/ziwei/constants';
import type { ZiweiChart, StarBrightness } from '@/lib/ziwei/types';

/* ── 五行（仅 14 主星有五行属性，来自 STAR_DESCRIPTIONS）── */
const WUXING_LIST = ['木', '火', '土', '金', '水'] as const;
type Wuxing = (typeof WUXING_LIST)[number];
const WUXING_COLOR: Record<Wuxing, string> = {
  木: '#22c55e',
  火: '#ef4444',
  土: '#f59e0b',
  金: '#cbd5e1',
  水: '#3b82f6',
};

/* ── 星曜亮度 9 档色阶（庙→地，由吉转凶）── */
const BRIGHT_ORDER: StarBrightness[] = ['庙', '旺', '得', '利', '平', '不', '闲', '陷', '地'];
const BRIGHT_COLOR: Record<StarBrightness, string> = {
  庙: '#15803d',
  旺: '#16a34a',
  得: '#65a30d',
  利: '#a3e635',
  平: '#eab308',
  不: '#f59e0b',
  闲: '#fb923c',
  陷: '#ef4444',
  地: '#b91c1c',
};

/** 统计 14 主星的五行分布（来自 STAR_DESCRIPTIONS 的 element 字段） */
function useWuxingCounts(chart: ZiweiChart) {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  let total = 0;
  for (const p of chart.palaces) {
    for (const s of p.stars) {
      if (s.type !== 'major') continue;
      const el = STAR_DESCRIPTIONS[s.name]?.element;
      if (el && el in counts) {
        counts[el] += 1;
        total += 1;
      }
    }
  }
  return { counts, total };
}

/** 收集命盘中出现的每一颗主星及其亮度（去重，保留首次出现） */
function useMainStarBrightness(chart: ZiweiChart) {
  const map = new Map<string, StarBrightness>();
  for (const p of chart.palaces) {
    for (const s of p.stars) {
      if (s.type === 'major' && s.brightnessRaw && !map.has(s.name)) {
        map.set(s.name, s.brightnessRaw);
      }
    }
  }
  // 按 STAR_DESCRIPTIONS 的 canonical 顺序排列，体验稳定
  return Object.keys(STAR_DESCRIPTIONS)
    .filter((name) => map.has(name))
    .map((name) => ({ name, brightness: map.get(name)! }));
}

export default function ChartViz({ chart }: { chart: ZiweiChart }) {
  const { counts, total } = useWuxingCounts(chart);
  const mainStars = useMainStarBrightness(chart);
  const dxs = chart.daXians;
  const minAge = dxs.length ? dxs[0].startAge : 0;
  const maxAge = dxs.length ? dxs[dxs.length - 1].endAge : 100;
  const span = Math.max(1, maxAge - minAge);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card-glass rounded-xl p-4 mb-4"
    >
      <div className="text-[10px] tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--t-faint)' }}>
        <span style={{ color: 'var(--t-gold)', opacity: 0.6 }}>▦</span>
        命盘数据可视化
      </div>

      {/* ── 1. 主星五行分布（环形图）── */}
      <Section title="主星五行分布" hint={`${total} 颗`}>
        <div className="flex items-center gap-4">
          <WuxingDonut counts={counts} total={total} />
          <div className="flex-1 grid grid-cols-1 gap-1.5">
            {WUXING_LIST.map((w) => {
              const n = counts[w];
              const pct = total ? Math.round((n / total) * 100) : 0;
              return (
                <div key={w} className="flex items-center gap-2 text-[11px]">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: WUXING_COLOR[w] }} />
                  <span style={{ color: 'var(--t-text2)' }}>{w}行</span>
                  <span className="ml-auto tabular-nums" style={{ color: 'var(--t-faint)' }}>{n} 颗 · {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── 2. 星曜亮度概览（9 档色阶矩阵）── */}
      <Section title="星曜亮度概览" hint="庙→地 由吉转凶">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {mainStars.map(({ name, brightness }) => (
            <div
              key={name}
              className="rounded-lg px-2 py-1.5 text-center"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--bdr)' }}
              title={`${name} · ${STAR_DESCRIPTIONS[name]?.element ?? ''}行 · ${brightness}`}
            >
              <div className="text-[11px] truncate" style={{ color: 'var(--t-text2)' }}>{name}</div>
              <div
                className="mt-0.5 inline-block text-[10px] px-1.5 py-px rounded-full font-medium"
                style={{ background: BRIGHT_COLOR[brightness], color: '#fff' }}
              >
                {brightness}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. 大运时间轴 ── */}
      <Section title="大运时间轴" hint={`${minAge}–${maxAge} 岁`}>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="relative" style={{ minWidth: 460, height: dxs.length * 30 + 8 }}>
            {dxs.map((dx, i) => {
              const left = ((dx.startAge - minAge) / span) * 100;
              const width = ((dx.endAge - dx.startAge) / span) * 100;
              const active = i === chart.currentDaXianIndex;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                  className="absolute flex items-center"
                  style={{ left: `${left}%`, width: `${width}%`, top: i * 30 + 4, height: 24 }}
                >
                  <div
                    className="h-full w-full rounded-md flex items-center px-2 overflow-hidden cursor-default"
                    style={{
                      background: active ? 'color-mix(in srgb, var(--ac) 22%, transparent)' : 'var(--bg-2)',
                      border: `1px solid ${active ? 'var(--ac)' : 'var(--bdr)'}`,
                      boxShadow: active ? '0 0 0 1px var(--ac) inset' : 'none',
                    }}
                    title={`${dx.startAge}–${dx.endAge}岁 · ${dx.palaceName}宫 · ${dx.stemName ?? ''}干`}
                  >
                    <span
                      className="text-[10px] whitespace-nowrap truncate"
                      style={{ color: active ? 'var(--ac)' : 'var(--t-text2)' }}
                    >
                      {dx.startAge}-{dx.endAge} · {dx.palaceName}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: 'var(--t-faint)' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ border: '1px solid var(--ac)', background: 'color-mix(in srgb, var(--ac) 22%, transparent)' }} />
          当前大限（{chart.currentAge} 岁）
        </div>
      </Section>
    </motion.div>
  );
}

/* ── 子组件 ── */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[12px] font-medium" style={{ color: 'var(--t-text1)' }}>{title}</span>
        {hint && <span className="text-[9px] ml-auto" style={{ color: 'var(--t-faint)', opacity: 0.8 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function WuxingDonut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const size = 92;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bdr)" strokeWidth={stroke} />
      {total > 0 &&
        WUXING_LIST.map((w) => {
          const frac = counts[w] / total;
          const dash = frac * c;
          const seg = (
            <circle
              key={w}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={WUXING_COLOR[w]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="rotate-90" style={{ transformOrigin: 'center', fontSize: 15, fontWeight: 600, fill: 'var(--t-text1)' }}>
        {total}
      </text>
    </svg>
  );
}
