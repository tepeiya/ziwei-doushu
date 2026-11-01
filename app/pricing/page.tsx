'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS, formatYuan, type Plan } from '@/lib/billing';
import SiteNav from '@/components/SiteNav';

export default function PricingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function buy(planId: string) {
    setErr('');
    setBusy(planId);
    try {
      const res = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      setBusy(null);
      if (!res.ok) {
        if (data.error === '未登录') { router.push('/login'); return; }
        setErr(data.error || '下单失败，请重试');
        return;
      }
      if (typeof data.payUrl === 'string' && data.payUrl.startsWith('http')) {
        window.location.href = data.payUrl;
      } else {
        router.push(data.payUrl || '/');
      }
    } catch {
      setBusy(null);
      setErr('网络异常，请重试');
    }
  }

  const list = Object.values(PLANS) as Plan[];

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">✦</div>
        <span className="mv-eyebrow">MEMBERSHIP</span>
        <h1 className="mv-h1">开通会员</h1>
        <p className="mv-sub">古法排盘免费，AI 深度解读与命书为会员专属</p>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        {list.map((p) => (
          <div
            key={p.id}
            className={`mv-card${p.popular ? ' mv-card-glow' : ''}`}
            style={{ position: 'relative' }}
          >
            {p.tag && (
              <span style={{
                position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8',
                fontSize: 11, padding: '3px 12px', borderRadius: 10, letterSpacing: '0.1em',
              }}>{p.tag}</span>
            )}
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx-0)', marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: 'var(--tx-3)', minHeight: 38 }}>{p.desc}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ac)', margin: '10px 0 2px' }}>
              {formatYuan(p.priceFen)}
              {p.period && <span style={{ fontSize: 13, color: 'var(--tx-3)', fontWeight: 400 }}> / {p.period}</span>}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 18px' }}>
              {p.features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: 'var(--tx-2)', padding: '5px 0', display: 'flex', gap: 7 }}>
                  <span style={{ color: 'var(--ac)' }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => buy(p.id)}
              disabled={busy === p.id}
              className={`mv-btn ${p.popular ? 'mv-btn-primary' : 'mv-btn-ghost'}`}
            >
              {busy === p.id ? '处理中…' : '立即开通'}
            </button>
          </div>
        ))}

        {err && <div style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, marginTop: 8 }}>{err}</div>}

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--tx-3)', marginTop: 20, lineHeight: 1.7, marginBottom: 8 }}>
          当前为沙箱演示：点击开通后将进入模拟支付页，无需真实扣款即可体验会员权益。<br />
          正式上线时接入微信支付 / 支付宝，回调验签后即可自动激活会员。
        </p>
      </div>
    </div>
  );
}
