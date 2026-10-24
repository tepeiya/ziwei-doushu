'use client';
import { useState } from 'react';
import Link from 'next/link';

export interface ChartItem {
  id: string;
  title?: string;
  birthInfo?: { year?: number; month?: number; day?: number; hour?: number; gender?: string };
  createdAt: number;
}

function fmtBirth(b?: ChartItem['birthInfo']): string {
  if (!b) return '未知生辰';
  const h = b.hour === 0 || b.hour === 23 ? '子时' : `${b.hour ?? '?'}时`;
  return `${b.year ?? '?'}年${b.month ?? '?'}月${b.day ?? '?'}日 ${h} · ${b.gender === 'male' ? '男' : b.gender === 'female' ? '女' : ''}`;
}

export default function ChartHistory({ charts }: { charts: ChartItem[] }) {
  const [list, setList] = useState<ChartItem[]>(charts);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm('确定删除该命盘？')) return;
    setBusy(id);
    try {
      await fetch(`/api/charts?id=${id}`, { method: 'DELETE' });
      setList((l) => l.filter((c) => c.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (list.length === 0) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--bdr-med)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--tx-3)', marginBottom: '16px' }}>还没有保存的命盘</p>
        <Link href="/chart" style={{ fontSize: '13px', color: 'var(--ac)' }}>去排盘并保存 →</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {list.map((c) => (
        <div key={c.id} style={{
          background: 'var(--bg-card)', border: '1px solid var(--bdr)', borderRadius: '12px', padding: '16px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', color: 'var(--tx-0)', fontWeight: 500 }}>
              {c.title || '未命名命盘'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--tx-3)', marginTop: '4px' }}>
              {fmtBirth(c.birthInfo)} · 保存于 {new Date(c.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
          <button onClick={() => remove(c.id)} disabled={busy === c.id} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1px solid var(--bdr-med)',
            background: 'transparent', color: '#dc2626', fontSize: '12px', cursor: busy === c.id ? 'not-allowed' : 'pointer', opacity: busy === c.id ? 0.5 : 1,
          }}>
            删除
          </button>
        </div>
      ))}
    </div>
  );
}
