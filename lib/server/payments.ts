/**
 * 真实支付网关接入（微信支付 v2 Native / 支付宝手机网站支付 WAP）
 * ─────────────────────────────────────────────────────────────
 * 全部按环境变量门控：未配置商户号时 createPayment 返回 null，由调用方回退沙箱。
 * 需要的环境变量：
 *   微信：WECHAT_APP_ID / WECHAT_MCH_ID / WECHAT_API_KEY(v2 商户密钥)
 *   支付宝：ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY(PKCS8) / ALIPAY_PUBLIC_KEY(支付宝公钥)
 * 可选：PAY_NOTIFY_BASE_URL（回调公网地址，缺省回退 NEXTAUTH_URL）
 *
 * 说明：未引入官方 SDK，签名与验签均用 Node 内置 crypto 实现（微信 MD5 / 支付宝 RSA2），
 * 网关调用用 fetch。商户密钥就绪即可真实收款；本文件不依赖任何第三方支付依赖。
 */
import crypto from 'crypto';

export type Gateway = 'wechat' | 'alipay';

export interface PaymentInput {
  orderId: string;
  amountFen: number; // 单位：分
  subject: string;
  channel: Gateway;
  clientIp?: string; // 微信需要
  returnUrl?: string; // 支付宝回跳
  notifyUrl: string; // 异步通知
}

export interface PaymentResult {
  gateway: Gateway;
  codeUrl?: string; // 微信 Native：需转二维码
  redirectUrl?: string; // 支付宝：可直接跳转的支付页
}

// ─── 工具 ────────────────────────────────────────────────
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string),
  );
}

/** 支付宝时间戳：yyyy-MM-dd HH:mm:ss（商户时区 +08:00） */
function alipayTimestamp(): string {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(
    d.getUTCMinutes(),
  )}:${p(d.getUTCSeconds())}`;
}

/** 允许传入带或不带 PEM 头的密钥，统一补全 PKCS8 头尾 */
function toPem(key: string, type: 'PRIVATE' | 'PUBLIC'): string {
  if (key.includes('BEGIN')) return key;
  const head = type === 'PRIVATE' ? 'PRIVATE KEY' : 'PUBLIC KEY';
  const body = key.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? key;
  return `-----BEGIN ${head}-----\n${body}\n-----END ${head}-----`;
}

// ─── 微信 v2 签名（MD5，key 参与）───
export function wechatSign(params: Record<string, string>, apiKey: string): string {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] != null)
    .sort();
  const str = keys.map((k) => `${k}=${params[k]}`).join('&') + `&key=${apiKey}`;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
}

export function buildWechatUnifiedOrderXml(
  input: PaymentInput,
  appId: string,
  mchId: string,
  apiKey: string,
): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const params: Record<string, string> = {
    appid: appId,
    mch_id: mchId,
    nonce_str: nonce,
    body: input.subject,
    out_trade_no: input.orderId,
    total_fee: String(input.amountFen),
    spbill_create_ip: input.clientIp || '127.0.0.1',
    notify_url: input.notifyUrl,
    trade_type: 'NATIVE',
  };
  params.sign = wechatSign(params, apiKey);
  const xml = Object.keys(params)
    .map((k) => `<${k}>${escapeXml(params[k])}</${k}>`)
    .join('');
  return `<xml>${xml}</xml>`;
}

export function verifyWechatNotify(
  xml: string,
  apiKey: string,
): { ok: boolean; outTradeNo?: string } {
  const signMatch = /<sign>(.*?)<\/sign>/.exec(xml);
  const outTradeNo = /<out_trade_no>(.*?)<\/out_trade_no>/.exec(xml)?.[1];
  if (!signMatch) return { ok: false };
  // 剥离根 <xml> 包裹，再逐字段解析（否则外层标签会被整体误捕为一个字段）
  const inner = xml.replace(/<xml[^>]*>/i, '').replace(/<\/xml>/i, '');
  const fields: Record<string, string> = {};
  const re = /<([a-zA-Z_]+)>(.*?)<\/\1>/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(inner))) {
    if (mm[1] !== 'sign') fields[mm[1]] = mm[2];
  }
  const computed = wechatSign(fields, apiKey);
  return { ok: computed === signMatch[1], outTradeNo };
}

// ─── 支付宝 RSA2 签名 ───
export function alipaySign(params: Record<string, string>, privateKey: string): string {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] != null)
    .sort();
  const str = keys.map((k) => `${k}=${params[k]}`).join('&');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(str, 'utf8');
  return signer.sign(toPem(privateKey, 'PRIVATE'), 'base64');
}

export function verifyAlipaySign(
  params: Record<string, string>,
  publicKey: string,
  sign: string,
): boolean {
  const { sign: _s, ...rest } = params;
  const keys = Object.keys(rest)
    .filter((k) => rest[k] !== '' && rest[k] != null)
    .sort();
  const str = keys.map((k) => `${k}=${rest[k]}`).join('&');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(str, 'utf8');
  try {
    return verifier.verify(toPem(publicKey, 'PUBLIC'), Buffer.from(sign, 'base64'));
  } catch {
    return false;
  }
}

/** 当前已配置的真实支付渠道（无则返回 null → 调用方回退沙箱） */
export function getConfiguredChannel(): Gateway | null {
  if (process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID && process.env.WECHAT_API_KEY) return 'wechat';
  if (process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY && process.env.ALIPAY_PUBLIC_KEY)
    return 'alipay';
  return null;
}

/** 调用真实网关下单，返回 code_url / redirectUrl；失败返回 null */
export async function createPayment(input: PaymentInput): Promise<PaymentResult | null> {
  if (input.channel === 'wechat') {
    const appId = process.env.WECHAT_APP_ID!;
    const mchId = process.env.WECHAT_MCH_ID!;
    const apiKey = process.env.WECHAT_API_KEY!;
    const xml = buildWechatUnifiedOrderXml(input, appId, mchId, apiKey);
    try {
      const resp = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
      });
      const body = await resp.text();
      const returnCode = /<return_code>(.*?)<\/return_code>/.exec(body)?.[1];
      const codeUrl = /<code_url>(.*?)<\/code_url>/.exec(body)?.[1];
      if (returnCode !== 'SUCCESS' || !codeUrl) return null;
      return { gateway: 'wechat', codeUrl };
    } catch {
      return null;
    }
  }

  if (input.channel === 'alipay') {
    const appId = process.env.ALIPAY_APP_ID!;
    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.wap.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: alipayTimestamp(),
      version: '1.0',
      notify_url: input.notifyUrl,
      return_url: input.returnUrl || '',
      biz_content: JSON.stringify({
        out_trade_no: input.orderId,
        total_amount: (input.amountFen / 100).toFixed(2),
        subject: input.subject,
        product_code: 'QUICK_WAP_WAY',
      }),
    };
    params.sign = alipaySign(params, process.env.ALIPAY_PRIVATE_KEY!);
    const query = new URLSearchParams(params).toString();
    return { gateway: 'alipay', redirectUrl: `https://openapi.alipay.com/gateway.do?${query}` };
  }

  return null;
}

/** 验签支付网关回调，返回订单号 */
export function verifyCallback(
  channel: Gateway,
  payload: { xml?: string; params?: Record<string, string> },
): { ok: boolean; orderId?: string } {
  if (channel === 'wechat') {
    const apiKey = process.env.WECHAT_API_KEY;
    if (!apiKey || !payload.xml) return { ok: false };
    const r = verifyWechatNotify(payload.xml, apiKey);
    return { ok: r.ok, orderId: r.outTradeNo };
  }
  const pub = process.env.ALIPAY_PUBLIC_KEY;
  const sign = payload.params?.sign;
  if (!pub || !sign || !payload.params) return { ok: false };
  return { ok: verifyAlipaySign(payload.params, pub, sign), orderId: payload.params.out_trade_no };
}
