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
    fetch(`/api/pay/verify?id=${orderId}`)
      .then((r) => r.json())
      .then(setOrder)
      .catch(() => setErr('订单加载失败'));
  }, [orderId]);

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
      <div
        className="with-tabbar"
        style={{
          minHeight: '100vh',
          background: 'var(--bg-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <SiteNav />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '20px', color: 'var(--tx-0)', marginBottom: '8px' }}>支付成功</h1>
          <p style={{ fontSize: '13px', color: 'var(--tx-3)' }}>会员权益已激活，正在前往个人中心…</p>
        </div>
      </div>
    );
  }

  const isAlipay = order?.gateway === 'alipay';
  const isWechat = order?.gateway === 'wechat';
  const isSandbox = !order?.gateway;

  return (
    <div
      className="with-tabbar"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <SiteNav />
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-card)',
          border: '1px solid var(--bdr)',
          borderRadius: '18px',
          padding: '36px 30px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--tx-0)', marginBottom: '6px' }}>订单支付</h1>
        <p style={{ fontSize: '12px', color: 'var(--tx-3)', marginBottom: '24px' }}>
          {isSandbox ? '沙箱演示 · 模拟支付（不真实扣款）' : isAlipay ? '支付宝支付' : '微信支付 · 请扫码'}
        </p>

        {order ? (
          <>
            <div style={{ fontSize: '34px', fontWeight: 700, color: 'var(--ac)', marginBottom: '4px' }}>
              {formatYuan(order.amount)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--tx-3)', marginBottom: '24px' }}>订单号 {orderId}</div>
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--tx-3)', marginBottom: '24px' }}>加载中…</div>
        )}

        {err && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{err}</div>}

        {/* 微信：展示 Native code_url（前端可据此生成二维码；此处给出可复制串） */}
        {isWechat && order?.codeUrl && (
          <div
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--bdr)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '11px',
              color: 'var(--tx-2)',
              wordBreak: 'break-all',
              textAlign: 'left',
            }}
          >
            请用微信「扫一扫」支付。若页面无法自动生成二维码，请复制以下链接到微信打开：
            <div style={{ marginTop: '8px', color: 'var(--ac)' }}>{order.codeUrl}</div>
            <button
              onClick={() => navigator.clipboard?.writeText(order.codeUrl!)}
              style={{
                marginTop: '8px',
                background: 'transparent',
                border: '1px solid var(--bdr)',
                borderRadius: '8px',
                color: 'var(--tx-2)',
                fontSize: '11px',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              复制支付链接
            </button>
          </div>
        )}

        {/* 支付宝：直接跳转网关 */}
        {isAlipay && order?.payUrl && (
          <button
            onClick={() => {
              window.location.href = order.payUrl!;
            }}
            disabled={busy}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              background: 'linear-gradient(135deg, #1677ff, #0a5ad6)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
              marginBottom: '12px',
            }}
          >
            前往支付宝支付
          </button>
        )}

        {/* 沙箱：模拟支付 */}
        {isSandbox && (
          <button
            onClick={sandboxPay}
            disabled={busy || !order}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              background: 'linear-gradient(135deg, #9a6210, #c88020)',
              color: '#fff8e8',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
              marginBottom: '12px',
            }}
          >
            {busy ? '支付中…' : '模拟支付'}
          </button>
        )}

        <button
          onClick={() => router.push('/pricing')}
          style={{
            width: '100%',
            marginTop: '4px',
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: 'var(--tx-3)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          取消并返回
        </button>
      </div>
    </div>
  );
}
