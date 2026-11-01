import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getAdmin } from '@/lib/admin';
import AdminConsole from '@/components/AdminConsole';
import SiteNav from '@/components/SiteNav';

export const dynamic = 'force-dynamic';

function Denied({ reason }: { reason: string }) {
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
        <div style={{ fontSize: 28, color: 'var(--ac)', opacity: 0.2, marginBottom: 12 }}>🔒</div>
        <p style={{ color: 'var(--tx-2)', fontSize: 15, marginBottom: 18 }}>{reason}</p>
        <Link
          href="/login?redirect=%2Fadmin"
          style={{
            padding: '12px 32px',
            borderRadius: 'var(--r-pill)',
            background: 'linear-gradient(135deg, #9a6210, #c88020)',
            color: '#fff8e8',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          去登录
        </Link>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return <Denied reason="请先登录后再进入系统管理" />;

  const admin = await getAdmin();
  if (!admin) return <Denied reason="当前账号没有管理员权限" />;

  return (
    <div className="with-tabbar" style={{ minHeight: '100vh', background: 'var(--bg-0)', padding: '32px 24px 80px' }}>
      <SiteNav />
      <AdminConsole />
    </div>
  );
}
