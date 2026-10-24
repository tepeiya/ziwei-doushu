'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS, formatYuan, type Plan } from '@/lib/billing';

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
      router.push(data.payUrl);
    } catch {
      setBusy(null);
      setErr('网络异常，请重试');
    }
  }

  const list = Object.values(PLANS) as Plan[];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--tx-0)', textAlign: 'center', letterSpacing: '0.1em' }}>开通会员 · 解锁完整解读</h1>
        <p style={{ fontSize: '14px', color: 'var(--tx-3)', textAlign: 'center', margin: '10px 0 40px' }}>
          古法排盘免费，AI 深度解读与命书为会员专属
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }} className="pricing-grid">
          {list.map((p) => (
            <div key={p.id} style={{
              background: 'var(--bg-card)', border: `1px solid ${p.popular ? 'var(--ac-bdr)' : 'var(--bdr)'}`,
              borderRadius: '18px', padding: '28px 22px', display: 'flex', flexDirection: 'column',
              position: 'relative', boxShadow: p.popular ? '0 8px 30px rgba(180,140,40,0.12)' : 'none',
            }}>
              {p.tag && (
                <span style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8',
                  fontSize: '11px', padding: '3px 12px', borderRadius: '10px', letterSpacing: '0.1em',
                }}>{p.tag}</span>
              )}
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tx-0)', marginBottom: '6px' }}>{p.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--tx-3)', minHeight: '38px' }}>{p.desc}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ac)', margin: '10px 0 2px' }}>
                {formatYuan(p.priceFen)}
                {p.period && <span style={{ fontSize: '13px', color: 'var(--tx-3)', fontWeight: 400 }}> / {p.period}</span>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 20px', flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: '13px', color: 'var(--tx-2)', padding: '5px 0', display: 'flex', gap: '7px' }}>
                    <span style={{ color: 'var(--ac)' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => buy(p.id)} disabled={busy === p.id} style={{
                padding: '11px', borderRadius: 'var(--r-pill)', border: 'none', cursor: busy === p.id ? 'not-allowed' : 'pointer', opacity: busy === p.id ? 0.6 : 1,
                background: p.popular ? 'linear-gradient(135deg, #9a6210, #c88020)' : 'var(--bg-2)',
                color: p.popular ? '#fff8e8' : 'var(--tx-0)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em',
              }}>
                {busy === p.id ? '处理中…' : '立即开通'}
              </button>
            </div>
          ))}
        </div>

        {err && <div style={{ textAlign: 'center', color: '#dc2626', fontSize: '13px', marginTop: '18px' }}>{err}</div>}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--tx-3)', marginTop: '28px', lineHeight: 1.7 }}>
          当前为沙箱演示：点击开通后将进入模拟支付页，无需真实扣款即可体验会员权益。<br />
          正式上线时接入微信支付 / 支付宝，回调验签后即可自动激活会员。
        </p>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
