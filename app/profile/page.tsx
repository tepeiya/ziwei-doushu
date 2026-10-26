import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listCharts, getMembership, isMember } from '@/lib/db';
import Link from 'next/link';
import ChartHistory, { type ChartItem } from '@/components/ChartHistory';
import SiteNav from '@/components/SiteNav';

export const dynamic = 'force-dynamic';

function NotLogin() {
  return (
    <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <SiteNav />
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--tx-2)', fontSize: '15px', marginBottom: '18px' }}>请先登录后查看命盘与会员</p>
        <Link href="/login" style={{
          padding: '12px 32px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #9a6210, #c88020)',
          color: '#fff8e8', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
        }}>去登录</Link>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return <NotLogin />;

  const charts = await listCharts(uid);
  const member = await isMember(uid);
  const m = await getMembership(uid);
  const nickname = session?.user?.name || '命主';
  const planName = m.plan === 'yearly' ? '年卡会员' : m.plan === 'monthly' ? '月卡会员' : '免费用户';
  const expires = m.expiresAt ? new Date(m.expiresAt).toLocaleDateString('zh-CN') : '—';

  return (
    <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)', padding: '32px 24px 80px' }}>
      <SiteNav />
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--tx-0)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          个人中心
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--tx-3)', marginBottom: '28px' }}>你好，{nickname}</p>

        {/* 会员卡片 */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--bdr)', borderRadius: '16px',
          padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--tx-3)', letterSpacing: '0.2em', marginBottom: '6px' }}>当前会员</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: member ? 'var(--ac)' : 'var(--tx-0)' }}>{planName}</div>
            <div style={{ fontSize: '12px', color: 'var(--tx-3)', marginTop: '4px' }}>
              {member ? `有效期至 ${expires}` : '开通会员解锁全部 AI 解读与命书'}
            </div>
          </div>
          {!member && (
            <Link href="/pricing" style={{
              padding: '10px 24px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #9a6210, #c88020)',
              color: '#fff8e8', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            }}>开通会员</Link>
          )}
        </div>

        {/* 命盘历史 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tx-0)' }}>我的命盘（{charts.length}）</h2>
          <Link href="/chart" style={{ fontSize: '13px', color: 'var(--ac)', textDecoration: 'none' }}>＋ 排新命盘</Link>
        </div>
        <ChartHistory charts={charts as unknown as ChartItem[]} />
      </div>
    </div>
  );
}
