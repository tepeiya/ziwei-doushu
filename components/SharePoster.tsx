'use client';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface Props {
  name?: string;
  birth?: string;
  wuxingJu?: string;
  mingGongStar?: string;
  summary?: string;
}

// 分享海报：把命盘关键信息渲染成卡片，html2canvas 截图导出 PNG。
// 含「仅供娱乐」水印与 CC BY 4.0 署名，满足合规与署名要求。
export default function SharePoster({ name, birth, wuxingJu, mingGongStar, summary }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: '#0a1622', scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `紫微命盘_${name || '命盘'}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        ref={ref}
        style={{
          width: 320, padding: 28, borderRadius: 18, color: '#f4e9d4',
          background: 'linear-gradient(160deg, #0f2233, #14202e)',
          border: '1px solid rgba(200,160,60,0.35)', fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: '0.3em', color: 'rgba(200,160,60,0.8)' }}>紫微斗数 · 命盘</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{name || '命主'}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{birth || '—'}</div>

        <div style={{ height: 1, background: 'rgba(200,160,60,0.25)', margin: '18px 0' }} />

        <div style={{ fontSize: 14, lineHeight: 1.9 }}>
          <div><span style={{ opacity: 0.6 }}>五行局：</span>{wuxingJu || '—'}</div>
          <div><span style={{ opacity: 0.6 }}>命宫主星：</span>{mingGongStar || '—'}</div>
        </div>

        {summary && (
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 14, lineHeight: 1.7 }}>{summary}</div>
        )}

        <div style={{ fontSize: 10.5, opacity: 0.55, marginTop: 18, lineHeight: 1.5 }}>
          ⚠️ 仅供娱乐参考，不构成决策依据
          <br />
          数据源自 ziwei-doushu（CC BY 4.0）
        </div>
      </div>

      <button
        onClick={download}
        disabled={busy}
        style={{
          marginTop: 12, padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1px solid var(--ac-bdr)',
          background: 'transparent', color: 'var(--ac)', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? '生成中…' : '生成分享图'}
      </button>
    </div>
  );
}
