import { ALL_STARS, STAR_TO_SLUG, ALL_TOPICS } from '@/lib/seo/knowledge';
import { TOPIC_LABEL, TOPIC_PALACE_NAME } from '@/lib/ziwei/db-analysis';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

export const metadata = {
  title: '紫微斗数知识库 · 14 主星 × 12 宫位详解',
  description: '紫微斗数 14 主星在各宫位的格局详解，涵盖命格、性格、感情、事业、财运、健康等维度。',
};

export default function SeoIndex() {
  return (
    <div className="with-tabbar">
      <SiteNav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px', color: 'var(--tx-1)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>紫微斗数知识库</h1>
      <p style={{ fontSize: 13, color: 'var(--tx-3)', marginBottom: 32, lineHeight: 1.7 }}>
        14 主星 × 各宫位的格局科普，按维度分类。点击进入查看详解，或
        <Link href="/chart" style={{ color: 'var(--ac)' }}> 免费排盘 </Link>
        获取你的专属命盘解读。
      </p>

      {ALL_STARS.map((star) => (
        <section key={star} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, color: 'var(--ac)', marginBottom: 14, borderBottom: '1px solid var(--bdr)', paddingBottom: 8 }}>
            {star}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ALL_TOPICS.map((t) => (
              <Link
                key={t}
                href={`/seo/${STAR_TO_SLUG[star]}/${t}`}
                style={{
                  fontSize: 13, padding: '7px 14px', borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--bdr-med)', color: 'var(--tx-2)', textDecoration: 'none',
                }}
              >
                {TOPIC_LABEL[t]}（{TOPIC_PALACE_NAME[t]}）
              </Link>
            ))}
          </div>
        </section>
      ))}

      <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 24, lineHeight: 1.7 }}>
        本知识库内容为传统文化科普，仅供娱乐参考，不构成任何决策依据。
      </p>
    </main>
    </div>
  );
}
