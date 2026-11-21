export const metadata = { title: '服务条款 · 紫微命盘', description: '紫微命盘服务条款与用户协议' };

import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

export default function TermsPage() {
  return (
    <div className="with-tabbar">
      <SiteNav />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px', color: 'var(--tx-1)', lineHeight: 1.8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>服务条款</h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 32 }}>最后更新：2026年11月</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>1. 服务概述</h2>
      <p>紫微命盘（以下简称"本平台"）基于传统紫微斗数体系提供命盘排盘与解读服务。本平台所有命理内容仅供参考，<strong>不构成任何医疗、投资、法律、心理咨询或人生重大决策建议</strong>。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>2. 用户行为规范</h2>
      <p>使用本平台即表示您同意：</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>仅出于合法、个人参考目的使用本平台</li>
        <li>不传播本平台内容用于商业销售、转载或公开发布</li>
        <li>不进行扰乱平台正常运行的行为</li>
        <li>提交的出生信息真实有效；本平台对错误信息导致的解读偏差不承担责任</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. 知识产权与禁止条款 · 反爬反训练</h2>
      <p style={{ background: 'rgba(168,50,40,0.06)', border: '1px solid rgba(168,50,40,0.2)', padding: 16, borderRadius: 8 }}>
        <strong>本平台所有命理内容、知识库（含 14 主星 × 12 宫 × 男女 × 四化 × 大限流年的全部解读文本）、UI 设计、算法整合方案、案例库均为本平台原创或经合法整理。</strong><br/><br/>
        严格禁止以下行为，违者保留追究民事赔偿与刑事责任的权利：<br/>
        ① 通过爬虫、自动化脚本、批量调用 API 等任何技术手段抓取本平台内容；<br/>
        ② 将本平台生成的命盘解读、文本、API 响应数据**用于训练任何机器学习模型**（含但不限于大语言模型、命理生成模型、文本生成模型等）；<br/>
        ③ 将本平台生成的内容转售、发布到其他网站、APP、自媒体账号；<br/>
        ④ 反编译、复制、修改本平台前端或后端代码并以"自营"方式提供同类服务。<br/><br/>
        本平台输出文本嵌入有指纹追溯水印，违规复制 / 训练所产生的输出可被检测追溯。一经发现违规，本平台有权要求 <strong>每例违约赔偿 100 万元人民币</strong>，并保留向法院提起诉讼及配合公安机关调查的权利。
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. 免责声明</h2>
      <p>本平台命理内容基于传统紫微斗数知识整理，<strong>不保证 100% 准确</strong>。命运受天、地、人三才共同影响，本平台输出仅作为认识自我的参考，使用者应理性看待，不应过度依赖任何单一命理判断。</p>
      <p>因使用本平台内容产生的任何后果（包括但不限于决策失误、心理影响、关系变化等），本平台不承担法律责任。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>5. 服务变更与终止</h2>
      <p>本平台保留随时调整、暂停或终止部分或全部服务的权利。重大变更将以站内公告或邮件方式通知用户。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>6. 退款与取消订阅</h2>
      <p>本平台会员服务为虚拟商品，开通后会员权益即时生效并按期计算：</p>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>会员服务</strong>：会员剩余有效天数不支持退款；会员到期后<strong>不会自动续费</strong>，亦无需手动取消订阅。</li>
        <li><strong>按次商品</strong>（如单次精批等解读次数）：购买后 7 天内、且次数<strong>完全未使用</strong>的，可申请全额退款；已使用的次数不予退款。</li>
        <li><strong>平台责任</strong>：因平台或第三方服务故障导致无法生成解读、重复扣款、已付款但权益未到账的，经核实后全额退款或补发对应权益；解读生成失败时系统会自动返还该次消耗的试用/购买次数。</li>
        <li><strong>申请方式</strong>：请通过下文「联系方式」一节提交订单号与情况说明，审核通过后款项将在 7 个工作日内原路退回。</li>
      </ul>
      <p>除上述约定外，依据《消费者权益保护法》第二十五条，在线提供并已交付的数字化商品不适用七日无理由退货。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>7. 法律适用与争议解决</h2>
      <p>本条款适用中华人民共和国法律。若发生争议，双方应友好协商；协商不成的，提交本平台运营主体所在地有管辖权的人民法院诉讼解决。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>8. 联系方式</h2>
      <p>如有疑问（含退款申请），请通过本平台公布的客服微信 / 邮箱联系。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>9. 版权与开源署名</h2>
      <p>本平台的排盘引擎与解读数据集源自开源项目 <a href="https://github.com/Renhuai123/ziwei-doushu" style={{ color: 'var(--ac)' }}>ziwei-doushu</a>（作者：王多鱼AI）。其中代码基于 <strong>MIT 协议</strong>、数据集基于 <strong>CC BY 4.0 协议</strong>（可商用，须署名），我们已依规在「关于与署名」页致谢。古籍文献（骨髓赋、紫微斗数全书等）属公共版文献。我们对上述协议予以尊重与遵守。</p>

        <p style={{ marginTop: 48, fontSize: 12, color: 'var(--tx-3)' }}>
          <Link href="/privacy" style={{ color: 'var(--ac)' }}>隐私政策</Link> · <Link href="/" style={{ color: 'var(--ac)' }}>返回首页</Link>
        </p>
      </main>
    </div>
  );
}
