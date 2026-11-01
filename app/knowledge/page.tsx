/**
 * /knowledge — 知识库主页
 * 列出 14 主星，每星可看其在 13 宫位的解读
 */

import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import FamousPersonCard from '@/components/FamousPersonCard';
import { ALL_STARS, ALL_TOPICS, getKnowledge, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { TOPIC_LABEL } from '@/lib/ziwei/db-analysis';
import { FAMOUS_PERSONS } from '@/lib/ziwei/famous';

export const metadata = {
  title: '紫微斗数知识库 · 14 主星 × 13 宫位 · 传统正宗体系',
  description: '基于传统《天纪》体系与古籍《紫微斗数全集》《骨髓赋》编纂的紫微斗数知识库。覆盖 14 主星在 13 个宫位的完整论断，含一句话定调、核心论断、命盘依据、经典出处。',
  keywords: ['紫微斗数', '传统', '传统紫微斗数', '紫微斗数全集', '紫微斗数全书', '14 主星', '12 宫位'],
};

export default function KnowledgeHomePage() {
  const STAR_DESCRIPTIONS_QUICK = STAR_BRIEF_SEO;

  return (
    <div className="mv-page mv-tabbed" style={{ background: 'var(--bg-0)' }}>
      <SiteNav />

      <div className="mv-hero">
        <div className="mv-mark-lg">✦</div>
        <span className="mv-eyebrow">KNOWLEDGE BASE</span>
        <h1 className="mv-h1">紫微斗数知识库</h1>
        <p className="mv-sub">
          14 主星 × 13 宫位 = <strong style={{ color: 'var(--ac)' }}>{ALL_STARS.length * ALL_TOPICS.length}</strong> 项专题<br />
          基于传统《天纪》体系编纂 · 含古籍引证
        </p>
      </div>

      <div className="mv-section-title">十四主星</div>
      <div style={{ padding: '0 16px 8px' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ALL_STARS.map(star => (
            <Link
              key={star}
              href={`/knowledge/${STAR_TO_SLUG[star]}/overview`}
              className="mv-card-flat"
              style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx-0)', letterSpacing: '0.15em' }}>{star}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mv-section-title">主星详解</div>
      <div style={{ padding: '0 16px 16px' }}>
        <div className="flex flex-col gap-3">
          {ALL_STARS.map(star => (
            <div key={star} className="mv-card-flat">
              <div className="flex items-baseline gap-3 mb-2">
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx-0)', letterSpacing: '0.1em' }}>{star}星</span>
                <span style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.15em' }}>ZI WEI · 14 STARS</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.7, marginBottom: 12 }}>
                {STAR_DESCRIPTIONS_QUICK[star] || ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TOPICS.map(t => {
                  const k = getKnowledge(star, t);
                  if (!k.exists) return null;
                  return (
                    <Link
                      key={t}
                      href={`/knowledge/${STAR_TO_SLUG[star]}/${t}`}
                      className="mv-chip"
                      style={{ textDecoration: 'none' }}
                    >
                      入{k.palaceName} · {TOPIC_LABEL[t]}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mv-section-title">名人命盘</div>
      <div style={{ padding: '0 16px 24px' }}>
        <div className="flex flex-col gap-3">
          {FAMOUS_PERSONS.slice(0, 3).map(person => (
            <FamousPersonCard
              key={person.id}
              person={person}
              shareHref={`/chart?y=${person.year}&m=${person.month}&d=${person.day}&h=${person.hour === 0 ? 23 : person.hour * 2 - 1}&mi=0&g=${person.gender === 'male' ? 'm' : 'f'}&n=${encodeURIComponent(person.name)}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
