import { ALL_STARS, STAR_TO_SLUG, SLUG_TO_STAR, ALL_TOPICS } from '@/lib/seo/knowledge';
import { STAR_DB, TOPIC_LABEL, TOPIC_PALACE_NAME } from '@/lib/ziwei/db-analysis';
import type { TopicKey } from '@/lib/ziwei/db-analysis';
import Link from 'next/link';
import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';

// 主星字段映射（与 lib/seo/knowledge 内部 StarContent 对应）
const TOPIC_FIELD: Record<TopicKey, string> = {
  overview: 'mingGong',
  personality: 'personality',
  love: 'fuQi',
  career: 'guanLu',
  wealth: 'caiBo',
  health: 'jiE',
  family: 'xiongDi',
  children: 'ziNv',
  move: 'qianYi',
  friends: 'jiaoYou',
  home: 'tianZhai',
  spirit: 'fuDe',
  parents: 'fuMu',
};

export function generateStaticParams() {
  return ALL_STARS.flatMap((star) =>
    ALL_TOPICS.map((topic) => ({ star: STAR_TO_SLUG[star], topic })),
  );
}

export function generateMetadata({ params }: { params: { star: string; topic: string } }): Metadata {
  const star = SLUG_TO_STAR[params.star];
  const topic = params.topic as TopicKey;
  if (!star || !TOPIC_LABEL[topic]) return { title: '紫微斗数知识 · 紫微命盘' };
  const label = TOPIC_LABEL[topic];
  const palace = TOPIC_PALACE_NAME[topic];
  return {
    title: `${star}在${palace}（${label}）详解 · 紫微斗数`,
    description: `详解${star}星坐${palace}对${label}的影响，含格局特征与传统断语。使用紫微命盘工具获取你的专属解读。`,
  };
}

function parseMarkers(content: string): { dingdiao?: string; lundian?: string; yiju?: string; chuchu?: string } {
  if (!content) return {};
  const get = (k: string) => {
    const m = content.match(new RegExp(`\\*\\*【${k}】\\*\\*([\\s\\S]*?)(?=\\*\\*【|$)`));
    return m ? m[1].trim() : undefined;
  };
  return { dingdiao: get('一句话定调'), lundian: get('核心论断'), yiju: get('命盘依据'), chuchu: get('经典出处') };
}

export default function SeoArticle({ params }: { params: { star: string; topic: string } }) {
  const star = SLUG_TO_STAR[params.star];
  const topic = params.topic as TopicKey;
  if (!star || !TOPIC_LABEL[topic]) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx-3)' }}>页面不存在</div>;
  }
  const label = TOPIC_LABEL[topic];
  const palace = TOPIC_PALACE_NAME[topic];
  const raw = (STAR_DB as Record<string, Record<string, string>>)?.[star]?.[TOPIC_FIELD[topic]];
  const m = parseMarkers(raw ?? '');
  const hasContent = !!(raw && raw.trim());

  return (
    <div className="with-tabbar">
      <SiteNav />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', color: 'var(--tx-1)', lineHeight: 1.85 }}>
      <div style={{ fontSize: 12, color: 'var(--tx-3)', letterSpacing: '0.2em', marginBottom: 8 }}>
        紫微斗数知识 · {label}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{star}在{palace}（{label}）详解</h1>
      <p style={{ fontSize: 13, color: 'var(--tx-3)', marginBottom: 28 }}>
        传统紫微斗数视角下的星曜格局科普，仅供娱乐参考。
      </p>

      {hasContent ? (
        <article>
          {m.dingdiao && (<section style={{ marginBottom: 18 }}><h2 style={{ fontSize: 17, marginBottom: 6 }}>一句话定调</h2><p>{m.dingdiao}</p></section>)}
          {m.lundian && (<section style={{ marginBottom: 18 }}><h2 style={{ fontSize: 17, marginBottom: 6 }}>核心论断</h2><p>{m.lundian}</p></section>)}
          {m.yiju && (<section style={{ marginBottom: 18 }}><h2 style={{ fontSize: 17, marginBottom: 6 }}>命盘依据</h2><p>{m.yiju}</p></section>)}
          {m.chuchu && (<section style={{ marginBottom: 18 }}><h2 style={{ fontSize: 17, marginBottom: 6 }}>经典出处</h2><p style={{ color: 'var(--tx-3)' }}>{m.chuchu}</p></section>)}
        </article>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <p style={{ fontSize: 14 }}>
            关于 <strong>{star}</strong> 坐 <strong>{palace}</strong> 对 <strong>{label}</strong> 的详细格局断语，
            属于专业命理解读内容。建议<b>输入你的真实生辰</b>，由排盘引擎生成你的专属命盘，
            再结合 AI 做针对性解读。
          </p>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg, rgba(154,98,16,0.12), rgba(200,128,32,0.08))', border: '1px solid var(--ac-bdr)', borderRadius: 14, padding: '20px 24px', margin: '28px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ac)', marginBottom: 6 }}>想看自己的命盘？</div>
        <p style={{ fontSize: 13, color: 'var(--tx-2)', marginBottom: 14 }}>输入出生年月日时，立即生成专属紫微命盘，并解锁 AI 深度解读。</p>
        <Link href="/chart" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #9a6210, #c88020)', color: '#fff8e8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          免费排盘 →
        </Link>
      </div>

      <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 32, lineHeight: 1.7 }}>
        <Link href="/seo" style={{ color: 'var(--ac)' }}>紫微斗数知识库</Link>
        {' · '}
        <Link href="/" style={{ color: 'var(--ac)' }}>返回首页</Link>
        <br />
        本页内容为传统文化科普，仅供娱乐参考，不构成任何人生、医疗、投资或法律决策依据。
      </p>
    </main>
    </div>
  );
}
