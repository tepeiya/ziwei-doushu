/**
 * 古籍原典查询库 · 主页
 * 列出所有收录古籍 + 全局搜索入口
 */

import Link from 'next/link';
import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics';
import LibrarySearch from './LibrarySearch';
import SiteNav from '@/components/SiteNav';

export const metadata = {
  title: '传统方法论 · 古籍原典库 · 紫微斗数全集 / 全书 / 骨髓赋',
  description: '紫微斗数权威古籍全文检索：《紫微斗数全集》《紫微斗数全书》《骨髓赋》传统《天纪》引证来源',
};

export default function LibraryHomePage() {
  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">📜</div>
        <span className="mv-eyebrow">CLASSICS</span>
        <h1 className="mv-h1">古籍原典库</h1>
        <p className="mv-sub">
          紫微斗数权威古籍全文检索<br />
          收录 <strong style={{ color: 'var(--ac)' }}>{ALL_BOOKS.length}</strong> 部古籍 · 共 <strong style={{ color: 'var(--ac)' }}>{TOTAL_PARAGRAPHS}</strong> 段精华
        </p>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <LibrarySearch />
      </div>

      <div className="mv-section-title">收录古籍</div>
      <div style={{ padding: '0 16px 24px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_BOOKS.map(book => (
            <Link
              key={book.slug}
              href={`/library/${book.slug}`}
              className="mv-card-flat"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.2em', marginBottom: 6 }}>
                {book.dynasty} · {book.author.split(' ')[0]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx-0)', marginBottom: 8, letterSpacing: '0.1em' }}>
                《{book.title}》
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.7, marginBottom: 12 }}>
                {book.intro}
              </div>
              <div className="flex gap-3" style={{ fontSize: 11, color: 'var(--tx-3)' }}>
                <span>{book.chapters.length} 章节</span>
                <span style={{ color: 'rgba(184,146,42,0.4)' }}>·</span>
                <span>{book.chapters.reduce((s, c) => s + c.paragraphs.length, 0)} 段精华</span>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ac)', letterSpacing: '0.15em', fontWeight: 500 }}>
                进入查阅 →
              </div>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: 20, background: 'var(--bg-card)', borderRadius: 'var(--mv-radius-sm)', textAlign: 'center', border: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 11, color: 'var(--ac-dim)', fontWeight: 600, letterSpacing: '0.15em', marginBottom: 8 }}>
            关于本库
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.8, maxWidth: 600, margin: '0 auto' }}>
            所收录古籍均为公版（明代刊本）。<br />
            内容持续完善，未来将补全《紫微斗数全集》全本与传统《天纪》引证目录。<br />
            如发现任何错误请联系我们。
          </div>
        </div>
      </div>
    </div>
  );
}
