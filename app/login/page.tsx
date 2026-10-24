'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) { setErr('请填写账号和密码'); return; }
    setErr('');
    setLoading(true);
    const res = await signIn('credentials', { identifier, password, redirect: false });
    setLoading(false);
    if (res?.error) { setErr('账号或密码错误'); return; }
    router.push('/profile');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        width: '100%', maxWidth: '380px', background: 'var(--bg-card)', border: '1px solid var(--bdr)',
        borderRadius: '18px', padding: '36px 30px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--tx-0)', marginBottom: '6px', letterSpacing: '0.1em' }}>登录</h1>
        <p style={{ fontSize: '13px', color: 'var(--tx-3)', marginBottom: '24px' }}>登录后可保存命盘、查看历史、解锁会员解读</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input className="input-base" style={{ fontSize: '14px' }} placeholder="手机号 / 邮箱"
            value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
          <input className="input-base" style={{ fontSize: '14px' }} type="password" placeholder="密码"
            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {err && <div style={{ fontSize: '13px', color: '#dc2626' }}>{err}</div>}
          <button type="submit" disabled={loading} style={{
            padding: '12px', borderRadius: 'var(--r-pill)', border: 'none', marginTop: '4px',
            background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8',
            fontSize: '14px', fontWeight: 600, letterSpacing: '0.15em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? '登录中…' : '登 录'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--tx-3)', textAlign: 'center' }}>
          还没有账号？<Link href="/register" style={{ color: 'var(--ac)' }}>立即注册</Link>
        </div>
      </div>
    </div>
  );
}
