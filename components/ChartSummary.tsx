'use client';
import { motion } from 'framer-motion';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import clsx from 'clsx';
import { detectPatterns, getMingGongSummary } from '@/lib/ziwei/patterns';
import { SIHUA_BADGE, type SiHua } from '@/lib/ziwei/sihua-colors';

interface ChartSummaryProps {
  chart: ZiweiChart;
}

const PatternLevelStyle = {
  excellent: { dot: 'bg-amber-400', label: 'text-amber-500', badge: 'text-amber-500 bg-amber-500/10 border-amber-500/25' },
  good: { dot: 'bg-sky-400', label: 'text-sky-500', badge: 'text-sky-500 bg-sky-500/10 border-sky-500/25' },
  neutral: { dot: 'bg-slate-400', label: 'text-slate-400', badge: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  caution: { dot: 'bg-orange-500', label: 'text-orange-500', badge: 'text-orange-500 bg-orange-500/10 border-orange-500/25' },
};

export default function ChartSummary({ chart }: ChartSummaryProps) {
  const patterns = detectPatterns(chart);
  const { stars: mingStars, keywords, nature } = getMingGongSummary(chart);
  const currentDx = chart.daXians[chart.currentDaXianIndex];

  // 阴阳性别：年干为阳干（甲丙戊庚壬，索引偶数为阳），结合性别得 阳男/阴男/阴女/阳女
  const yinYangGender =
    chart.yinYangGender ??
    `${chart.lunarInfo.yearStem % 2 === 0 ? '阳' : '阴'}${chart.birthInfo.gender === 'male' ? '男' : '女'}`;

  const siHuaSummary: { name: string; siHua: string; palaceName: string }[] = [];
  for (const palace of chart.palaces) {
    for (const star of palace.stars) {
      if (star.siHua) {
        siHuaSummary.push({ name: star.name, siHua: star.siHua, palaceName: palace.name });
      }
    }
  }
  const siHuaOrder = ['禄', '权', '科', '忌'];
  siHuaSummary.sort((a, b) => siHuaOrder.indexOf(a.siHua) - siHuaOrder.indexOf(b.siHua));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="space-y-4"
    >
      {/* ── 命格总览 ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      >
      <div className="card-glass rounded-xl p-5">
        <div className="text-[10px] tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--t-faint)' }}>
          <span style={{ color: 'var(--t-gold)', opacity: 0.6 }}>✦</span>
          命格总览
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div>
            <div className="text-[9px] mb-1.5" style={{ color: 'var(--t-faint)', opacity: 0.85 }}>命宫主星</div>
            <div className="flex items-center gap-1">
              {mingStars.length > 0 ? (
                mingStars.map(s => (
                  <span key={s} className="font-bold text-lg" style={{ color: 'var(--t-gold)' }}>{s}</span>
                ))
              ) : (
                <span className="text-sm" style={{ color: 'var(--t-faint)' }}>空宫</span>
              )}
            </div>
            {nature && (
              <div className="text-[10px] mt-1" style={{ color: 'var(--t-gold)', opacity: 0.5 }}>{nature}</div>
            )}
          </div>

          {keywords.length > 0 && (
            <div>
              <div className="text-[9px] mb-1.5" style={{ color: 'var(--t-faint)', opacity: 0.85 }}>性格特质</div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map(k => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      color: 'var(--t-gold)',
                      background: 'rgba(212,168,67,0.08)',
                      border: '1px solid rgba(212,168,67,0.15)',
                    }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 右侧信息簇：五行局 / 命主身主 */}
          <div className="ml-auto text-right space-y-3">
            <div>
              <div className="text-[9px] mb-1" style={{ color: 'var(--t-faint)', opacity: 0.85 }}>五行局 · 当前大限</div>
              <div className="text-[11px]" style={{ color: 'var(--t-text2)' }}>{chart.wuxingJuName}</div>
              {currentDx && (
                <div className="text-[11px] text-purple-500 mt-0.5">
                  {currentDx.startAge}~{currentDx.endAge}岁 · {currentDx.palaceName}
                </div>
              )}
            </div>

            {/* 命主 / 身主 / 阴阳性别 */}
            <div>
              <div className="text-[9px] mb-1" style={{ color: 'var(--t-faint)', opacity: 0.85 }}>命主 · 身主</div>
              <div className="text-[11px] font-medium" style={{ color: 'var(--t-gold-dim)' }}>
                {chart.mingZhu ?? '—'} · {chart.shenZhu ?? '—'}
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--t-faint)' }}>{yinYangGender}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]"
          style={{ borderTop: '1px solid var(--t-border)', color: 'var(--t-faint)' }}>
          <span>公历 {chart.birthInfo.year}-{chart.birthInfo.month}-{chart.birthInfo.day}</span>
          <span>
            农历 {chart.lunarInfo.lunarYear}年{chart.lunarInfo.isLeapMonth ? '闰' : ''}
            {chart.lunarInfo.lunarMonth}月{chart.lunarInfo.lunarDay}日
          </span>
          <span>{STEMS[chart.lunarInfo.yearStem]}{BRANCHES[chart.lunarInfo.yearBranch]}年 · {BRANCHES[chart.birthInfo.hour]}时</span>
          <span>命宫{BRANCHES[chart.mingGongBranch]} · 身宫{BRANCHES[chart.shenGongBranch]}</span>
        </div>
      </div>
      </motion.div>

      {/* ── 八字四柱 ── */}
      {chart.lunarInfo.fourPillars && (() => {
        const pillars = chart.lunarInfo.fourPillars!;
        const labels = ['年', '月', '日', '时'] as const;
        return (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="card-glass rounded-xl p-4">
              <div className="text-[10px] tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--t-faint)' }}>
                <span style={{ color: 'var(--t-gold)', opacity: 0.6 }}>☰</span>
                八字四柱
                <span className="text-[9px] ml-auto" style={{ color: 'var(--t-faint)', opacity: 0.6 }}>节气换柱</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {labels.map((label, i) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center py-2 rounded-lg"
                    style={{ border: '1px solid var(--t-border)', background: 'var(--t-surface)' }}
                  >
                    <span className="text-[8px] mb-1" style={{ color: 'var(--t-faint)' }}>{label}柱</span>
                    <span className="text-[13px] font-bold font-mono tracking-wide" style={{ color: 'var(--t-gold)' }}>{pillars[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* ── 本命四化 ── */}
      {siHuaSummary.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
        <div className="card-glass rounded-xl p-4">
          <div className="text-[10px] tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--t-faint)' }}>
            <span style={{ color: 'var(--t-gold)', opacity: 0.6 }}>◆</span>
            本命四化
          </div>
          <div className="grid grid-cols-2 gap-2">
            {siHuaSummary.map(({ name, siHua, palaceName }) => {
              return (
                <div key={name + siHua}
                  className={clsx('sihua-badge flex items-center justify-between px-3 py-2 rounded-lg text-[10px]', SIHUA_BADGE[siHua as SiHua])}
                >
                  <span className="font-medium">{name}</span>
                  <div className="flex items-center gap-1.5 text-right">
                    <span style={{ opacity: 0.6 }} className="text-[9px]">{palaceName.replace('宫', '')}</span>
                    <span className="font-bold">化{siHua}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </motion.div>
      )}

      {/* ── 格局识别 ── */}
      {patterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
        <div className="card-glass rounded-xl p-4">
          <div className="text-[10px] tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--t-faint)' }}>
            <span style={{ color: 'var(--t-gold)', opacity: 0.6 }}>◉</span>
            格局识别
            <span className="text-[9px] ml-auto" style={{ color: 'var(--t-faint)', opacity: 0.75 }}>{patterns.length}个格局</span>
          </div>
          <div className="space-y-2">
            {patterns.map((p, i) => {
              const st = PatternLevelStyle[p.level];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="card-inner rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                    <span className={`text-[11px] font-medium ${st.label}`}>{p.name}</span>
                    <div className="flex gap-1 ml-auto">
                      {p.palaces.slice(0, 2).map(pa => (
                        <span key={pa} className={`text-[8px] px-1.5 py-px rounded-full border ${st.badge}`}>
                          {pa.replace('宫', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed pl-3.5" style={{ color: 'var(--t-text2)' }}>
                    {p.description}
                  </p>

                  {p.conditions && (
                    <div className="mt-2 pl-3.5 space-y-0.5">
                      {p.conditions.required.length > 0 && (
                        <div className="text-[9px] leading-relaxed" style={{ color: 'var(--t-text2)', opacity: 0.85 }}>
                          <span className="font-medium" style={{ color: 'var(--t-gold)' }}>必须</span>
                          <span style={{ opacity: 0.6 }}> · </span>
                          {p.conditions.required.join('、')}
                        </div>
                      )}
                      {p.conditions.bonus && p.conditions.bonus.length > 0 && (
                        <div className="text-[9px] leading-relaxed" style={{ color: 'var(--t-text2)', opacity: 0.85 }}>
                          <span className="font-medium text-emerald-500">加分</span>
                          <span style={{ opacity: 0.6 }}> · </span>
                          {p.conditions.bonus.join('、')}
                        </div>
                      )}
                      {p.conditions.breaking && p.conditions.breaking.length > 0 && (
                        <div className="text-[9px] leading-relaxed" style={{ color: 'var(--t-text2)', opacity: 0.85 }}>
                          <span className="font-medium text-orange-500">破格</span>
                          <span style={{ opacity: 0.6 }}> · </span>
                          {p.conditions.breaking.join('、')}
                        </div>
                      )}
                    </div>
                  )}

                  {p.source && (
                    <div className="text-[9px] mt-1.5 pl-3.5" style={{ color: 'var(--t-faint)', opacity: 0.5 }}>
                      出处 · {p.source}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
        </motion.div>
      )}

      {/* ── 大限运程 ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.88, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
      <div className="card-glass rounded-xl p-4">
        <div className="text-[10px] tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--t-faint)' }}>
          <span className="text-purple-500/60">◎</span>
          大限运程
        </div>
        <div className="grid grid-cols-3 gap-2">
          {chart.daXians.slice(0, 9).map((dx, i) => {
            const isCurrent = i === chart.currentDaXianIndex;
            return (
              <div
                key={i}
                className="text-[10px] px-2 py-2 rounded-lg text-center transition-colors"
                style={{
                  border: isCurrent
                    ? '1px solid rgba(147,51,234,0.4)'
                    : '1px solid var(--t-border)',
                  background: isCurrent ? 'rgba(147,51,234,0.08)' : 'transparent',
                  color: isCurrent ? '#a78bfa' : 'var(--t-faint)',
                }}
              >
                <div className="font-mono tabular-nums">{dx.startAge}~{dx.endAge}</div>
                <div className="text-[9px] mt-0.5" style={{ opacity: 0.7 }}>{dx.palaceName.replace('宫', '')}</div>
              </div>
            );
          })}
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
}
