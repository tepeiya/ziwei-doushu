'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatYuan } from '@/lib/billing';
import SiteNav from '@/components/SiteNav';

interface OrderInfo {
  status: string;
  amount: number;
  plan: string;
}

export default function PayPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const router = useRouter();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`/api/pay/verify?id=${orderId}`)
      .then((r) => r.json())
      .then(setOrder)
      .catch(() => setErr('订单加载失败'));
  }, [orderId]);

  async function pay() {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/pay/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) { setErr('支付失败，请重试'); setBusy(false); return; }
      setDone(true);
      setTimeout(() => router.push('/profile'), 1600);
    } catch {
      setErr('网络异常，请重试');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <SiteNav />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '20px', color: 'var(--tx-0)', marginBottom: '8px' }}>支付成功</h1>
          <p style={{ fontSize: '13px', color: 'var(--tx-3)' }}>会员权益已激活，正在前往个人中心…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <SiteNav />
      <div style={{ width: '100%', maxWidth: '380px', background: 'var(--bg-card)', border: '1px solid var(--bdr)', borderRadius: '18px', padding: '36px 30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--tx-0)', marginBottom: '6px' }}>订单支付</h1>
        <p style={{ fontSize: '12px', color: 'var(--tx-3)', marginBottom: '24px' }}>沙箱演示 · 模拟支付（不真实扣款）</p>

        {order ? (
          <>
            <div style={{ fontSize: '34px', fontWeight: 700, color: 'var(--ac)', marginBottom: '4px' }}>{formatYuan(order.amount)}</div>
            <div style={{ fontSize: '12px', color: 'var(--tx-3)', marginBottom: '24px' }}>订单号 {orderId}</div>
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--tx-3)', marginBottom: '24px' }}>加载中…</div>
        )}

        {err && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{err}</div>}

        <button onClick={pay} disabled={busy || !order} style={{
          width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: 'none',
          background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8',
          fontSize: '15px', fontWeight: 600, letterSpacing: '0.15em', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
        }}>
          {busy ? '支付中…' : '模拟支付'}
        </button>

        <button onClick={() => router.push('/pricing')} style={{
          width: '100%', marginTop: '12px', padding: '10px', background: 'transparent', border: 'none',
          color: 'var(--tx-3)', fontSize: '13px', cursor: 'pointer',
        }}>取消并返回</button>
      </div>
    </div>
  );
}
