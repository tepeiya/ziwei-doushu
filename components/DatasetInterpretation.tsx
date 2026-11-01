'use client';

import { useState } from 'react';
import type { BirthInfo } from '@/lib/ziwei/types';

interface Dim {
  key: string;
  label: string;
  text: string;
}
interface DatasetResult {
  found: boolean;
  key?: string;
  mingStar?: string | null;
  titles?: Record<string, number>;
  dimensions?: Dim[];
}

type LoadState = 'idle' | 'loading' | 'done' | 'error';

export default function DatasetInterpretation({ birth }: { birth: BirthInfo | null }) {
  const [state, setState] = useState<LoadState>('idle');
  const [data, setData] = useState<DatasetResult | null>(null);
  const [active, setActive] = useState<string>('overview');
  const [error, setError] = useState<string>('');

  async function load() {
    if (!birth) return;
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/interpret-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: birth.year,
          month: birth.month,
          day: birth.day,
          hour: birth.hour,
          gender: birth.gender,
        }),
      });
      const json: DatasetResult = await res.json();
      if (!res.ok || !json.found) {
        setData(json);
        setState('done');
        return;
      }
      setData(json);
      setActive('overview');
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setState('error');
    }
  }

  if (!birth) return null;

  const dims = data?.dimensions ?? [];
  const activeDim = dims.find((d) => d.key === active) ?? dims[0];
  const loading = state === 'loading';

  return (
    <section className="card-glass rounded-xl p-5">
      {/* 标题行：金条 + 标题 + 离线徽章 + 加载按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ width: 3, height: 20, background: 'var(--t-gold)', borderRadius: 2 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--tx-0)', letterSpacing: '0.04em' }}>
          v4.0 数据集解读
        </h2>
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 999,
            color: 'var(--ac)',
            background: 'var(--ac-bg)',
            border: '1px solid var(--ac-bdr)',
            whiteSpace: 'nowrap',
          }}
        >
          离线 · 确定性
        </span>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn-accent"
          style={{ marginLeft: 'auto', ...(loading ? { opacity: 0.6, cursor: 'default' } : {}) }}
        >
          {loading ? '加载中…' : data ? '重新加载' : '加载 v4.0 离线解读'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
        CC BY 4.0 开源紫微斗数解读数据集 · 13 维原生论断（命格总览 / 性格 / 感情 / 事业 / 财运 / 健康 / 兄弟 / 子女 / 迁移 / 人际 / 田宅 / 福德 / 父母）
      </p>

      <div className="divider" style={{ marginTop: 14, marginBottom: 14 }} />

      {state === 'idle' && (
        <p style={{ color: 'var(--tx-3)', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
          点击右上角按钮，从本地 v4.0 数据集读取该命盘的 13 维解读。数据集为开源确定性结果，无需联网、不消耗额度。
        </p>
      )}

      {state === 'error' && (
        <p style={{ color: 'var(--ji)', fontSize: 14, margin: 0 }}>加载失败：{error}</p>
      )}

      {state === 'done' && data && !data.found && (
        <p style={{ color: 'var(--tx-3)', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
          该出生组合在 v4.0 数据集中无记录（数据集覆盖公历 1950–2026 的真实日期）。
        </p>
      )}

      {state === 'done' && data?.found && (
        <div>
          {data.mingStar && (
            <p style={{ fontSize: 13, color: 'var(--tx-2)', margin: '0 0 12px' }}>
              命宫主星：<b style={{ color: 'var(--t-gold)' }}>{data.mingStar}</b>
            </p>
          )}

          <div className="tab-container" style={{ flexWrap: 'wrap', gap: 6, marginTop: 0 }}>
            {dims.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setActive(d.key)}
                className={`tab-item ${d.key === active ? 'active' : ''}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {activeDim && (
            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.85,
                fontSize: 15,
                color: 'var(--t-text2)',
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr)',
                borderRadius: 'var(--r-md)',
                padding: '16px 18px',
                maxHeight: 520,
                overflowY: 'auto',
                marginTop: 14,
              }}
            >
              {activeDim.text || '（该维度无内容）'}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
