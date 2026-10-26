'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/components/ThemeProvider';
import { useT } from '@/lib/i18n';

/** 顶部横向导航（桌面端） */
const NAV_LINKS = [
  { href: '/chart', key: 'nav.chart' },
  { href: '/heming', key: 'nav.heming' },
  { href: '/fortune', key: 'nav.fortune' },
  { href: '/annual', key: 'nav.annual' },
  { href: '/knowledge', key: 'nav.knowledge' },
  { href: '/library', key: 'nav.library' },
];

/** 底部 Tab 栏（移动端） */
const TAB_LINKS = [
  { href: '/', key: 'nav.home', glyph: '⌂' },
  { href: '/chart', key: 'nav.chart', glyph: '☯' },
  { href: '/heming', key: 'nav.heming', glyph: '❤' },
  { href: '/knowledge', key: 'nav.knowledge', glyph: '✿' },
  { href: '/profile', key: 'nav.profile', glyph: '☻' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? '切换亮色主题' : '切换暗色主题'}
      className="flex items-center justify-center rounded-full border transition-colors"
      style={{
        width: compact ? 34 : 36,
        height: compact ? 34 : 36,
        borderColor: 'var(--t-border-acc)',
        background: 'var(--t-card)',
        color: 'var(--t-gold)',
        fontSize: 14,
      }}
    >
      {isDark ? '☀' : '☾'}
    </button>
  );
}

export default function SiteNav({ header = true }: { header?: boolean }) {
  const pathname = usePathname();
  const { status } = useSession();
  const authed = status === 'authenticated';
  const t = useT();

  return (
    <>
      {header && (
      <>
      {/* ══ 顶部导航（桌面 + 移动 slim 版）══ */}
      <header
        className="sticky top-0 z-50 hidden md:flex items-center justify-between px-6 lg:px-10 h-14 border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg-0) 88%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--bdr)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 shrink-0" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 18, color: 'var(--t-gold)' }}>☯</span>
          <span className="font-semibold tracking-[0.2em]" style={{ color: 'var(--tx-0)', fontSize: 14 }}>紫微命盘</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="主导航">
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className="px-3 py-1.5 rounded-full text-[13px] transition-colors"
                style={{
                  textDecoration: 'none',
                  color: active ? 'var(--t-gold)' : 'var(--tx-2)',
                  background: active ? 'var(--t-border-acc)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {t(l.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {authed ? (
            <Link href="/profile" className="btn-ghost" style={{ padding: '7px 16px', fontSize: 13 }}>
              我的命盘
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] px-3 py-1.5" style={{ color: 'var(--tx-2)', textDecoration: 'none' }}>登录</Link>
              <Link href="/register" className="btn-accent" style={{ padding: '7px 16px', fontSize: 13 }}>注册</Link>
            </>
          )}
        </div>
      </header>

      {/* ══ 移动端 slim 顶栏（仅首页以外的页面需要，但统一渲染不影响体验）══ */}
      <header
        className="sticky top-0 z-50 flex md:hidden items-center justify-between px-4 h-12 border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg-0) 90%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--bdr)',
        }}
      >
        <Link href="/" className="flex items-center gap-1.5" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 16, color: 'var(--t-gold)' }}>☯</span>
          <span className="font-semibold tracking-[0.15em]" style={{ color: 'var(--tx-0)', fontSize: 13 }}>紫微命盘</span>
        </Link>
        <ThemeToggle compact />
        </header>
      </>
      )}
      {/* ══ 移动端底部 Tab 栏 ══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch justify-around border-t"
        aria-label="底部导航"
        style={{
          background: 'color-mix(in srgb, var(--bg-0) 94%, transparent)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderColor: 'var(--bdr)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TAB_LINKS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
              style={{ textDecoration: 'none', color: active ? 'var(--t-gold)' : 'var(--tx-3)' }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.glyph}</span>
              <span style={{ fontSize: 10 }}>{t(tab.key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
