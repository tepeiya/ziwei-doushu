'use client';
import { useEffect, useState } from 'react';

// 全站娱乐免责横幅：首次访问弹出，用户确认后通过 localStorage 记忆，
// 避免每次刷新都打扰。满足「全站统一娱乐参考声明」的合规要求。
export default function Disclaimer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('disclaimer-ack')) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--bdr)',
        padding: '12px 16px',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        fontSize: '12px',
        color: 'var(--tx-2)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ lineHeight: 1.5 }}>
        ⚠️ 本网站所有命理内容均基于传统紫微斗数文化，<strong style={{ fontWeight: 600 }}>仅供娱乐与自我探索参考</strong>，
        不构成任何人生、医疗、投资或法律决策依据。
      </span>
      <button
        onClick={() => {
          try { localStorage.setItem('disclaimer-ack', '1'); } catch { /* ignore */ }
          setShow(false);
        }}
        style={{
          flexShrink: 0,
          padding: '7px 16px',
          borderRadius: 'var(--r-pill)',
          border: '1px solid var(--ac-bdr)',
          background: 'transparent',
          color: 'var(--ac)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        我已知晓
      </button>
    </div>
  );
}
