'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import ScrollIntro from '@/components/ScrollIntro';

export default function PreviewPage() {
  const router = useRouter();
  // replayKey 用于强制重置 ScrollIntro（用户点"再播放一次"时）
  const [replayKey, setReplayKey] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <>
      {/* 卷轴开场动画 */}
      <ScrollIntro key={replayKey} onComplete={() => setDone(true)} />

      {/* 动画结束后的「样片说明 + 操作按钮」面板 */}
      {done && (
        <div className="with-tabbar">
        <SiteNav />
        <main style={{
          minHeight: '100vh',
          background: '#0d0a08',
          color: '#e8dcc4',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 24px',
          fontFamily: '"STSong", "Songti SC", serif',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.4em', color: '#c89647', marginBottom: '16px' }}>
            SCROLL · INTRO · PREVIEW
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 3.5vw, 40px)',
            letterSpacing: '0.18em',
            color: '#e8dcc4',
            marginBottom: '16px',
            fontWeight: 600,
          }}>
            紫微卷轴 · 开场预览
          </h1>
          <p style={{
            fontSize: '14px', color: '#a89878',
            maxWidth: '500px', lineHeight: 1.9,
            letterSpacing: '0.1em',
            marginBottom: '40px',
            fontFamily: '"STKaiti", "Kaiti SC", serif',
          }}>
            刚才看到的卷轴效果会在每次进入主页时缓缓铺开。<br />
            如果满意，告诉我，我把它接到主页 / 上线。
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
            <button
              onClick={() => { setDone(false); setReplayKey(k => k + 1); }}
              style={{
                background: '#a8302a',
                color: '#f5ecd7',
                padding: '14px 28px',
                fontSize: '14px',
                fontFamily: '"STSong", serif',
                letterSpacing: '0.3em',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              再 播 放 一 次
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'transparent',
                color: '#e8dcc4',
                padding: '14px 28px',
                fontSize: '14px',
                fontFamily: '"STSong", serif',
                letterSpacing: '0.3em',
                border: '1px solid rgba(232,220,196,0.25)',
                cursor: 'pointer',
              }}
            >
              进 入 原 版 首 页
            </button>
          </div>

          <div style={{
            marginTop: '40px', fontSize: '12px', color: '#6e6048',
            letterSpacing: '0.15em',
            display: 'flex', gap: '20px',
          }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>原版 ↗</Link>
            <span>·</span>
            <Link href="/chart" style={{ color: 'inherit', textDecoration: 'none' }}>命盘</Link>
            <span>·</span>
            <Link href="/heming" style={{ color: 'inherit', textDecoration: 'none' }}>合盘</Link>
          </div>

          {/* 时间轴说明 */}
          <div style={{
            marginTop: '64px',
            padding: '24px 32px',
            border: '1px solid rgba(232,220,196,0.12)',
            maxWidth: '500px',
            fontSize: '12px',
            color: '#a89878',
            lineHeight: 1.9,
            letterSpacing: '0.1em',
            fontFamily: '"STKaiti", serif',
            textAlign: 'left',
          }}>
            <div style={{ color: '#c89647', marginBottom: '12px', letterSpacing: '0.2em', fontSize: '11px' }}>动画时间轴</div>
            <div>· 0.0 ~ 1.7 s &nbsp;&nbsp;卷轴从中央向两侧展开</div>
            <div>· 1.9 ~ 2.7 s &nbsp;&nbsp;宣纸内容浮现（标题 + 副标 + 朱砂印）</div>
            <div>· 2.7 ~ 3.5 s &nbsp;&nbsp;停留欣赏</div>
            <div>· 3.5 ~ 4.2 s &nbsp;&nbsp;整体淡出，进入主页</div>
            <div style={{ marginTop: '12px', color: '#6e6048', fontSize: '11px' }}>
              用户随时可点右下「跳过」直接进入主页。
            </div>
          </div>
        </main>
        </div>
      )}
    </>
  );
}
