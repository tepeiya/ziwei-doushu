export const metadata = { title: '关于与署名 · 紫微命盘', description: '版权与开源署名声明' };

export default function AboutPage() {
  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-0)', borderBottom: '1px solid var(--bdr)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--tx-3)', textDecoration: 'none' }}>
          <span style={{ fontSize: '16px' }}>‹</span>
          <span>返回首页</span>
        </a>
        <div style={{ width: '1px', height: '20px', background: 'var(--bdr-med)' }} />
        <span style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em' }}>紫微命盘</span>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px', color: 'var(--tx-1)', lineHeight: 1.85 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>关于与署名声明</h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 32 }}>最后更新：2026年10月</p>

        <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>1. 关于本平台</h2>
        <p>
          紫微命盘是一个基于传统紫微斗数体系的排盘与解读工具。我们致力于用现代工程能力，
          把古典命理以清晰、可交互的方式呈现，帮助用户在传统文化视角下认识自我、调节心态。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>2. 开源致谢与署名（CC BY 4.0）</h2>
        <p>
          本平台所使用的紫微斗数排盘引擎与解读数据集，源自开源项目
          <a href="https://github.com/Renhuai123/ziwei-doushu" style={{ color: 'var(--ac)' }}> ziwei-doushu</a>
          （GitHub：Renhuai123/ziwei-doushu，作者：王多鱼AI）。依照其开源协议，我们在此郑重署名：
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>代码</strong>（lib/、app/、components/ 等）：基于 <strong>MIT 协议</strong>，保留原始 LICENSE 与版权声明。</li>
          <li><strong>紫微斗数数据集 v4.0 / v3.0</strong>：基于 <strong>CC BY 4.0 协议</strong>（可商用，须署名）。本平台已依规在此署名，并保留对原作者的致谢。</li>
          <li><strong>古籍文献</strong>（骨髓赋、紫微斗数全书等）：属公共版（公版）文献，无版权限制。</li>
        </ul>
        <p style={{ fontSize: 13, color: 'var(--tx-3)' }}>
          我们尊重并遵守上述开源协议。如您认为任何内容涉及授权问题，请联系我们处理。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. 内容性质声明</h2>
        <p>
          本平台所有命理内容均基于传统紫微斗数文化整理，
          <strong>仅供娱乐与自我探索参考，不构成任何人生、医疗、投资或法律决策依据</strong>。
          健康相关表述仅作传统养生文化角度的泛谈，请务必以现代医学诊断为准。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. 相关链接</h2>
        <p>
          <a href="/privacy" style={{ color: 'var(--ac)' }}>隐私政策</a>
          {' · '}
          <a href="/terms" style={{ color: 'var(--ac)' }}>服务条款</a>
          {' · '}
          <a href="/" style={{ color: 'var(--ac)' }}>返回首页</a>
        </p>
      </main>
    </>
  );
}
