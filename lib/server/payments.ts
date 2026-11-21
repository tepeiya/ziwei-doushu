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
import { paymentConfigFromEnv, type PaymentConfig } from '@/lib/payment-config';

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

/** 微信 v2 应答的字符串字段普遍包在 CDATA 里，取值前先剥掉，否则验签与状态判断全错。 */
function unwrapCdata(v: string): string {
  const t = v.trim();
  const m = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(t);
  return m ? m[1] : t;
}

function xmlField(xml: string, name: string): string | undefined {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? unwrapCdata(m[1]) : undefined;
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
  expected?: { appId?: string; mchId?: string },
): { ok: boolean; outTradeNo?: string; amountFen?: number; tradeState?: string } {
  const signMatch = /<sign>([\s\S]*?)<\/sign>/.exec(xml);
  if (!signMatch) return { ok: false };
  // 剥离根 <xml> 包裹，再逐字段解析（否则外层标签会被整体误捕为一个字段）
  const inner = xml.replace(/<xml[^>]*>/i, '').replace(/<\/xml>/i, '');
  const fields: Record<string, string> = {};
  const re = /<([a-zA-Z_]+)>([\s\S]*?)<\/\1>/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(inner))) {
    if (mm[1] !== 'sign') fields[mm[1]] = unwrapCdata(mm[2]);
  }
  const computed = wechatSign(fields, apiKey);
  // 常数时间比较：避免逐字符短路比较泄露签名前缀（时序侧信道）
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(unwrapCdata(signMatch[1]).toUpperCase(), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false };
  // 商户身份核对：防止其它 appid/商户号的通知串入本账号入账
  if (expected?.appId && fields.appid !== expected.appId) return { ok: false };
  if (expected?.mchId && fields.mch_id !== expected.mchId) return { ok: false };
  const totalFee = Number(fields.total_fee);
  return {
    ok: true,
    outTradeNo: fields.out_trade_no,
    amountFen: Number.isFinite(totalFee) ? totalFee : undefined,
    tradeState: fields.trade_state,
  };
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
  // 支付宝规则：待签串需剔除 sign 与 sign_type 两个参数（异步通知会带 sign_type）
  const { sign: _s, sign_type: _t, ...rest } = params;
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
export function getConfiguredChannel(cfg: PaymentConfig = paymentConfigFromEnv()): Gateway | null {
  if (cfg.wechatAppId && cfg.wechatMchId && cfg.wechatApiKey) return 'wechat';
  if (cfg.alipayAppId && cfg.alipayPrivateKey && cfg.alipayPublicKey) return 'alipay';
  return null;
}

/** 调用真实网关下单，返回 code_url / redirectUrl；失败返回 null */
export async function createPayment(
  input: PaymentInput,
  cfg: PaymentConfig = paymentConfigFromEnv(),
): Promise<PaymentResult | null> {
  if (input.channel === 'wechat') {
    const appId = cfg.wechatAppId;
    const mchId = cfg.wechatMchId;
    const apiKey = cfg.wechatApiKey;
    const xml = buildWechatUnifiedOrderXml(input, appId, mchId, apiKey);
    try {
      const resp = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
      });
      const body = await resp.text();
      const returnCode = xmlField(body, 'return_code');
      const codeUrl = xmlField(body, 'code_url');
      if (returnCode !== 'SUCCESS' || !codeUrl) return null;
      return { gateway: 'wechat', codeUrl };
    } catch {
      return null;
    }
  }

  if (input.channel === 'alipay') {
    const appId = cfg.alipayAppId;
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
    params.sign = alipaySign(params, cfg.alipayPrivateKey);
    const query = new URLSearchParams(params).toString();
    return { gateway: 'alipay', redirectUrl: `https://openapi.alipay.com/gateway.do?${query}` };
  }

  return null;
}

/**
 * 支付成功的交易状态白名单。
 * 其余状态（微信 REFUND/CLOSED、支付宝 WAIT_BUYER_PAY/TRADE_CLOSED）
 * 只是网关的过程通知，绝不能据此入账。
 */
const PAID_TRADE_STATES = new Set(['SUCCESS', 'TRADE_SUCCESS', 'TRADE_FINISHED']);

export function isPaidTradeState(state?: string): boolean {
  return !!state && PAID_TRADE_STATES.has(state);
}

export interface CallbackResult {
  ok: boolean;
  orderId?: string;
  /** 回调金额（分）：与订单 amount 不符即拒绝入账 */
  amountFen?: number;
  /** 网关交易状态原值，配合 isPaidTradeState 判定 */
  tradeState?: string;
}

/** 验签支付网关回调，并回传金额与交易状态供入账前校验 */
export function verifyCallback(
  channel: Gateway,
  payload: { xml?: string; params?: Record<string, string> },
  cfg: PaymentConfig = paymentConfigFromEnv(),
): CallbackResult {
  if (channel === 'wechat') {
    const apiKey = cfg.wechatApiKey;
    if (!apiKey || !payload.xml) return { ok: false };
    const r = verifyWechatNotify(payload.xml, apiKey, {
      appId: cfg.wechatAppId,
      mchId: cfg.wechatMchId,
    });
    return { ok: r.ok, orderId: r.outTradeNo, amountFen: r.amountFen, tradeState: r.tradeState };
  }
  const pub = cfg.alipayPublicKey;
  const sign = payload.params?.sign;
  if (!pub || !sign || !payload.params) return { ok: false };
  // 商户身份核对：其它 app_id 的通知不得入账
  if (cfg.alipayAppId && payload.params.app_id !== cfg.alipayAppId) return { ok: false };
  if (!verifyAlipaySign(payload.params, pub, sign)) return { ok: false };
  const yuan = Number.parseFloat(payload.params.total_amount ?? '');
  return {
    ok: true,
    orderId: payload.params.out_trade_no,
    amountFen: Number.isFinite(yuan) ? Math.round(yuan * 100) : undefined,
    tradeState: payload.params.trade_status,
  };
}

// ─── 主动查单（对账补偿：异步回调丢失时也能确认收款）─────────

export interface QueryResult {
  /** 是否拿到可信应答（验签通过）。false = 查不准，订单保持原状，绝不据此入账或关单 */
  ok: boolean;
  paid: boolean;
  amountFen?: number;
  tradeState?: string;
}

const UNQUERYABLE: QueryResult = { ok: false, paid: false };

/**
 * 支付宝对响应节点的 JSON **原文**签名（含键序与空白），
 * 必须截取原始子串验签；重新序列化后再验必然失败。
 */
function extractAlipayNode(body: string, node: string): string | null {
  const key = `"${node}"`;
  const i = body.indexOf(key);
  if (i < 0) return null;
  const start = body.indexOf('{', i + key.length);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < body.length; j++) {
    const c = body[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return body.slice(start, j + 1);
    }
  }
  return null;
}

export function verifyAlipayRawSign(raw: string, publicKey: string, sign: string): boolean {
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(raw, 'utf8');
  try {
    return verifier.verify(toPem(publicKey, 'PUBLIC'), Buffer.from(sign, 'base64'));
  } catch {
    return false;
  }
}

/** 向网关查询订单真实支付状态。网络/验签失败一律返回 ok:false，由调用方保持订单原状。 */
export async function queryPayment(
  orderId: string,
  channel: Gateway,
  cfg: PaymentConfig = paymentConfigFromEnv(),
): Promise<QueryResult> {
  if (channel === 'wechat') {
    const { wechatAppId: appId, wechatMchId: mchId, wechatApiKey: apiKey } = cfg;
    if (!appId || !mchId || !apiKey) return UNQUERYABLE;
    const params: Record<string, string> = {
      appid: appId,
      mch_id: mchId,
      out_trade_no: orderId,
      nonce_str: crypto.randomBytes(16).toString('hex'),
    };
    params.sign = wechatSign(params, apiKey);
    const xml = `<xml>${Object.keys(params)
      .map((k) => `<${k}>${escapeXml(params[k])}</${k}>`)
      .join('')}</xml>`;
    try {
      const resp = await fetch('https://api.mch.weixin.qq.com/pay/orderquery', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
      });
      const body = await resp.text();
      if (xmlField(body, 'return_code') !== 'SUCCESS') return UNQUERYABLE;
      if (xmlField(body, 'result_code') !== 'SUCCESS') {
        // 网关侧查无此单：可信的「未支付」，交给超时关单处理
        return xmlField(body, 'err_code') === 'ORDERNOTEXIST' ? { ok: true, paid: false } : UNQUERYABLE;
      }
      const v = verifyWechatNotify(body, apiKey, { appId, mchId });
      if (!v.ok || v.outTradeNo !== orderId) return UNQUERYABLE;
      return {
        ok: true,
        paid: isPaidTradeState(v.tradeState),
        amountFen: v.amountFen,
        tradeState: v.tradeState,
      };
    } catch {
      return UNQUERYABLE;
    }
  }

  const { alipayAppId: appId, alipayPrivateKey: priv, alipayPublicKey: pub } = cfg;
  if (!appId || !priv || !pub) return UNQUERYABLE;
  const params: Record<string, string> = {
    app_id: appId,
    method: 'alipay.trade.query',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: alipayTimestamp(),
    version: '1.0',
    biz_content: JSON.stringify({ out_trade_no: orderId }),
  };
  params.sign = alipaySign(params, priv);
  try {
    const resp = await fetch('https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams(params).toString(),
    });
    const body = await resp.text();
    const raw = extractAlipayNode(body, 'alipay_trade_query_response');
    const sign = /"sign"\s*:\s*"([^"]+)"/.exec(body)?.[1];
    if (!raw || !sign || !verifyAlipayRawSign(raw, pub, sign)) return UNQUERYABLE;
    const node = JSON.parse(raw) as {
      code?: string;
      out_trade_no?: string;
      trade_status?: string;
      total_amount?: string;
    };
    if (node.out_trade_no !== orderId) return UNQUERYABLE;
    // 40004 = 业务失败（含 ACQ.TRADE_NOT_EXIST 查无此单），同样视为可信未支付
    if (node.code !== '10000') return node.code === '40004' ? { ok: true, paid: false } : UNQUERYABLE;
    const yuan = Number.parseFloat(node.total_amount ?? '');
    return {
      ok: true,
      paid: isPaidTradeState(node.trade_status),
      amountFen: Number.isFinite(yuan) ? Math.round(yuan * 100) : undefined,
      tradeState: node.trade_status,
    };
  } catch {
    return UNQUERYABLE;
  }
}
