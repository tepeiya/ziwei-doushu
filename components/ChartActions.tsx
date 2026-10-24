'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SharePoster from './SharePoster';
import type { ZiweiChart } from '@/lib/ziwei/types';

const btnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--bdr-med)',
  background: 'transparent', color: 'var(--tx-2)', fontSize: 12, cursor: 'pointer',
};

export default function ChartActions({ chart }: { chart: ZiweiChart }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [msg, setMsg] = useState('');

  const b = chart.birthInfo as { year?: number; month?: number; day?: number; hour?: number; gender?: string } | undefined;
  const birth = b ? `${b.year}年${b.month}月${b.day}日 ${b.hour}时 ${b.gender === 'male' ? '男' : '女'}` : '';
  const wuxingJu = chart.wuxingJuName;
  const mingGong = chart.palaces.find((p) => p.isMingGong);
  const mingStar = mingGong?.stars?.[0]?.name ?? '—';

  async function save() {
    setMsg('');
    try {
      const res = await fetch('/api/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, birthInfo: b }),
      });
      if (res.status === 401) { router.push('/login'); return; }
      if (res.ok) { setSaved(true); setMsg('已保存到「我的命盘」'); }
      else setMsg('保存失败，请重试');
    } catch {
      setMsg('保存失败，请重试');
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
      <button onClick={save} style={btnStyle}>{saved ? '✓ 已保存' : '保存命盘'}</button>
      <button onClick={() => setShowPoster((v) => !v)} style={btnStyle}>
        {showPoster ? '收起海报' : '分享海报'}
      </button>
      {msg && (
        <span style={{ fontSize: 12, color: saved ? 'var(--ac)' : '#dc2626' }}>{msg}</span>
      )}
      {showPoster && (
        <div style={{ width: '100%', marginTop: 12 }}>
          <SharePoster name="命主" birth={birth} wuxingJu={wuxingJu} mingGongStar={mingStar} summary="" />
        </div>
      )}
    </div>
  );
}
