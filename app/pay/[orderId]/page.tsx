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
  gateway?: string | null;
  codeUrl?: string;
  payUrl?: string;
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
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function poll() {
      if (cancelled || attempts >= 200) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/pay/verify?id=${orderId}`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data || data.error) {
          if (res.status === 404) {
            setErr('订单不存在或已被清理，请重新下单');
            return;
          }
          throw new Error('verify failed');
        }
        setOrder(data);
        setErr('');
        if (data.status === 'paid') {
          setDone(true);
          setTimeout(() => router.push('/profile'), 1600);
          return;
        }
        if (data.gateway) timer = setTimeout(poll, 3000);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    }
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, router]);

  async function sandboxPay() {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/pay/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        setErr('支付失败，请重试');
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/profile'), 1600);
    } catch {
      setErr('网络异常，请重试');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mv-page" style={{ background: 'var(--bg-0)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <SiteNav />
        <div className="mv-center">
          <div className="mv-center-emoji">✅</div>
          <h1 className="mv-h1" style={{ fontSize: 20 }}>支付成功</h1>
          <p className="mv-sub">会员权益已激活，正在前往个人中心…</p>
        </div>
      </div>
    );
  }

  const isAlipay = order?.gateway === 'alipay';
  const isWechat = order?.gateway === 'wechat';
  const isSandbox = !order?.gateway;

  return (
    <div className="mv-page" style={{ background: 'var(--bg-0)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <SiteNav />
      <div className="mv-modal" style={{ position: 'static', boxShadow: 'none', background: 'var(--bg-card)', borderColor: 'var(--bdr)' }}>
        <div className="mv-modal-title">订单支付</div>
        <div className="mv-modal-body" style={{ marginBottom: 16 }}>
          {isSandbox ? '沙箱演示 · 模拟支付（不真实扣款）' : isAlipay ? '支付宝支付' : '微信支付 · 请扫码'}
        </div>

        {order ? (
          <>
            <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--ac)', marginBottom: 4 }}>
              {typeof order.amount === 'number' ? formatYuan(order.amount) : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 20 }}>订单号 {orderId}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--tx-3)', marginBottom: 20 }}>加载中…</div>
        )}

        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {isWechat && order?.codeUrl && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 11, color: 'var(--tx-2)', wordBreak: 'break-all', textAlign: 'left' }}>
            请用微信「扫一扫」支付。若页面无法自动生成二维码，请复制以下链接到微信打开：
            <div style={{ marginTop: 8, color: 'var(--ac)' }}>{order.codeUrl}</div>
            <button
              onClick={() => navigator.clipboard?.writeText(order.codeUrl!)}
              style={{ marginTop: 8, background: 'transparent', border: '1px solid var(--bdr)', borderRadius: 8, color: 'var(--tx-2)', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
            >
              复制支付链接
            </button>
          </div>
        )}

        {isAlipay && order?.payUrl && (
          <button
            onClick={() => { window.location.href = order.payUrl!; }}
            disabled={busy}
            className="mv-btn mv-btn-primary"
            style={{ background: 'linear-gradient(135deg, #1677ff, #0a5ad6)', marginBottom: 12 }}
          >
            前往支付宝支付
          </button>
        )}

        {isSandbox && (
          <button onClick={sandboxPay} disabled={busy || !order} className="mv-btn mv-btn-primary" style={{ marginBottom: 12 }}>
            {busy ? '支付中…' : '模拟支付'}
          </button>
        )}

        <button onClick={() => router.push('/pricing')} className="mv-btn mv-btn-ghost">
          取消并返回
        </button>
      </div>
    </div>
  );
}
