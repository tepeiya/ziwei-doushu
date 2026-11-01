import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listCharts, getMembership, isMember } from '@/lib/db';
import { getAdmin } from '@/lib/admin';
import Link from 'next/link';
import ChartHistory, { type ChartItem } from '@/components/ChartHistory';
import SiteNav from '@/components/SiteNav';

export const dynamic = 'force-dynamic';

function NotLogin() {
  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <SiteNav />
      <div className="mv-center">
        <div className="mv-center-emoji">☯</div>
        <div className="mv-sub">请先登录后查看命盘与会员</div>
        <Link href="/login" className="mv-btn mv-btn-primary mv-btn-block" style={{ textDecoration: 'none' }}>去登录</Link>
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
  const isAdmin = !!(await getAdmin());
  const m = await getMembership(uid);
  const nickname = session?.user?.name || '命主';
  const planName = m.plan === 'yearly' ? '年卡会员' : m.plan === 'monthly' ? '月卡会员' : '免费用户';
  const expires = m.expiresAt ? new Date(m.expiresAt).toLocaleDateString('zh-CN') : '—';

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">☯</div>
        <span className="mv-eyebrow">MEMBER</span>
        <h1 className="mv-h1">{nickname}</h1>
        <p className="mv-sub">你好，欢迎回来</p>
      </div>

      {/* 会员卡片 */}
      <div className="mv-card mv-card-glow">
        <div className="mv-row" style={{ marginBottom: 14 }}>
          <span className="mv-label" style={{ margin: 0 }}>当前会员</span>
          <span className="mv-chip mv-chip-active">{member ? planName : '免费用户'}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: member ? 'var(--ac)' : 'var(--tx-0)', letterSpacing: '0.05em', marginBottom: 6 }}>
          {planName}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx-3)' }}>
          {member ? `有效期至 ${expires}` : '开通会员解锁全部 AI 解读与命书'}
        </div>
        {!member && (
          <Link href="/pricing" className="mv-btn mv-btn-primary mv-btn-block" style={{ marginTop: 16, textDecoration: 'none' }}>开通会员</Link>
        )}
      </div>

      {isAdmin && (
        <div className="mv-card" style={{ borderColor: 'rgba(212,168,67,0.35)' }}>
          <div className="mv-label">管理员</div>
          <div style={{ fontSize: 14, color: 'var(--tx-0)', marginBottom: 12 }}>你拥有系统管理权限</div>
          <Link href="/admin" className="mv-btn mv-btn-ghost" style={{ textDecoration: 'none' }}>进入系统管理</Link>
        </div>
      )}

      {/* 命盘历史 */}
      <div className="mv-section-title">我的命盘（{charts.length}）</div>
      <div className="mv-card-flat">
        <ChartHistory charts={charts as unknown as ChartItem[]} />
        <Link href="/chart" className="mv-btn mv-btn-ghost mv-btn-block" style={{ marginTop: 14, textDecoration: 'none' }}>＋ 排新命盘</Link>
      </div>
    </div>
  );
}
