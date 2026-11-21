import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  wechatSign,
  verifyWechatNotify,
  alipaySign,
  verifyAlipaySign,
  verifyCallback,
  isPaidTradeState,
  verifyAlipayRawSign,
} from '../../lib/server/payments';
import type { PaymentConfig } from '../../lib/payment-config';

const apiKey = 'test_wechat_api_key_1234567890';

// ── 微信 v2 签名（MD5，确定性 + 大写 32 位）──
const wp: Record<string, string> = {
  appid: 'wx123',
  mch_id: 'm1',
  nonce_str: 'abc',
  body: 'x',
  out_trade_no: 'o1',
  total_fee: '100',
  spbill_create_ip: '1.1.1.1',
  notify_url: 'https://n',
  trade_type: 'NATIVE',
};
const s1 = wechatSign(wp, apiKey);
assert.equal(s1, wechatSign(wp, apiKey), 'wechatSign 应确定性');
assert.match(s1, /^[0-9A-F]{32}$/, 'MD5 大写 32 位');

// ── 微信通知验签 round-trip ──
const notifyParams: Record<string, string> = {
  appid: 'wx123',
  mch_id: 'm1',
  out_trade_no: 'o1',
  result_code: 'SUCCESS',
  return_code: 'SUCCESS',
};
const nsign = wechatSign(notifyParams, apiKey);
const notifyXml = `<xml>${Object.keys(notifyParams)
  .map((k) => `<${k}>${notifyParams[k]}</${k}>`)
  .join('')}<sign>${nsign}</sign></xml>`;
const v = verifyWechatNotify(notifyXml, apiKey);
assert.equal(v.ok, true, '合法通知应验签通过');
assert.equal(v.outTradeNo, 'o1');
const tampered = notifyXml.replace('o1', 'o2');
assert.equal(verifyWechatNotify(tampered, apiKey).ok, false, '篡改订单号应验签失败');

// ── 支付宝 RSA2 签名 round-trip ──
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const ap: Record<string, string> = {
  app_id: 'a1',
  method: 'alipay.trade.wap.pay',
  charset: 'utf-8',
  timestamp: '2026-01-01 00:00:00',
  version: '1.0',
  out_trade_no: 'o9',
  total_amount: '1.00',
  subject: 's',
};
const asign = alipaySign(ap, privPem);
// 异步通知会带 sign_type，且它与 sign 一样不参与待签串
const apNotify = { ...ap, sign_type: 'RSA2', sign: asign };
assert.ok(verifyAlipaySign(apNotify, pubPem, asign), '合法支付宝签名应验签通过');
assert.ok(!verifyAlipaySign({ ...apNotify, out_trade_no: 'o10' }, pubPem, asign), '篡改订单号应验签失败');

// ── 入账前校验：交易状态白名单 ──
assert.ok(isPaidTradeState('SUCCESS'), '微信 SUCCESS 应判定已付款');
assert.ok(isPaidTradeState('TRADE_SUCCESS'), '支付宝 TRADE_SUCCESS 应判定已付款');
assert.ok(isPaidTradeState('TRADE_FINISHED'), '支付宝 TRADE_FINISHED 应判定已付款');
assert.ok(!isPaidTradeState('WAIT_BUYER_PAY'), '未付款状态不得入账');
assert.ok(!isPaidTradeState('REFUND'), '退款状态不得入账');
assert.ok(!isPaidTradeState(undefined), '缺失状态不得入账');

// ── 微信通知：金额/状态回传 + 商户身份核对 ──
const wxPaid: Record<string, string> = {
  appid: 'wx123',
  mch_id: 'm1',
  out_trade_no: 'o7',
  total_fee: '2990',
  trade_state: 'SUCCESS',
  result_code: 'SUCCESS',
};
const wxPaidXml = `<xml>${Object.keys(wxPaid)
  .map((k) => `<${k}>${wxPaid[k]}</${k}>`)
  .join('')}<sign>${wechatSign(wxPaid, apiKey)}</sign></xml>`;
const w = verifyWechatNotify(wxPaidXml, apiKey, { appId: 'wx123', mchId: 'm1' });
assert.equal(w.ok, true, '合法微信通知应验签通过');
assert.equal(w.amountFen, 2990, '应回传金额（分）供与订单比对');
assert.equal(w.tradeState, 'SUCCESS');
assert.equal(verifyWechatNotify(wxPaidXml, apiKey, { appId: 'other' }).ok, false, 'appid 不符应拒绝');
assert.equal(verifyWechatNotify(wxPaidXml, apiKey, { mchId: 'other' }).ok, false, '商户号不符应拒绝');

// ── 微信验签：常数时间比较（长度不等不得抛错，大小写归一）──
const lowerSignXml = wxPaidXml.replace(/<sign>(.*?)<\/sign>/, (_m, s: string) => `<sign>${s.toLowerCase()}</sign>`);
assert.equal(verifyWechatNotify(lowerSignXml, apiKey).ok, true, '小写签名应归一后通过');
const shortSignXml = wxPaidXml.replace(/<sign>.*?<\/sign>/, '<sign>AB</sign>');
assert.equal(verifyWechatNotify(shortSignXml, apiKey).ok, false, '长度不符的签名应拒绝且不抛错');

// ── 支付宝通知：含 sign_type 的真实通知 + 金额/状态回传 ──
const alipayCfg: PaymentConfig = {
  channel: 'auto',
  wechatAppId: '',
  wechatMchId: '',
  wechatApiKey: '',
  alipayAppId: 'a1',
  alipayPrivateKey: privPem,
  alipayPublicKey: pubPem,
};
const alipayBase: Record<string, string> = {
  app_id: 'a1',
  out_trade_no: 'o9',
  total_amount: '29.90',
  trade_status: 'TRADE_SUCCESS',
  seller_id: 's1',
  charset: 'utf-8',
};
/** 真实异步通知的待签串不含 sign_type，这里按同样规则构造 */
const alipayNotify = (over: Record<string, string> = {}): Record<string, string> => {
  const p = { ...alipayBase, ...over };
  const sign = alipaySign(p, privPem);
  return { ...p, sign_type: 'RSA2', sign };
};
const cb = verifyCallback('alipay', { params: alipayNotify() }, alipayCfg);
assert.equal(cb.ok, true, '带 sign_type 的真实支付宝通知应验签通过');
assert.equal(cb.orderId, 'o9');
assert.equal(cb.amountFen, 2990, '元应折算为分');
assert.equal(cb.tradeState, 'TRADE_SUCCESS');
assert.ok(isPaidTradeState(cb.tradeState));
const pending = verifyCallback('alipay', { params: alipayNotify({ trade_status: 'WAIT_BUYER_PAY' }) }, alipayCfg);
assert.equal(pending.ok, true, '验签本身仍应通过');
assert.ok(!isPaidTradeState(pending.tradeState), '等待买家付款不得入账');
assert.equal(verifyCallback('alipay', { params: alipayNotify({ app_id: 'a2' }) }, alipayCfg).ok, false, 'app_id 不符应拒绝');

// ── 微信真实应答带 CDATA：必须解包后验签（否则 return_code/签名全错）──
const cdataXml = (fields: Record<string, string>, key: string): string => {
  const sign = wechatSign(fields, key);
  const body = Object.keys(fields)
    .map((k) => `<${k}><![CDATA[${fields[k]}]]></${k}>`)
    .join('');
  return `<xml>${body}<sign><![CDATA[${sign}]]></sign></xml>`;
};
const cd = verifyWechatNotify(cdataXml(wxPaid, apiKey), apiKey, { appId: 'wx123', mchId: 'm1' });
assert.equal(cd.ok, true, 'CDATA 包裹的微信通知应验签通过');
assert.equal(cd.tradeState, 'SUCCESS', 'CDATA 内的交易状态应正确解出');
assert.equal(cd.amountFen, 2990);
const cdBad = cdataXml(wxPaid, apiKey).replace('<![CDATA[2990]]>', '<![CDATA[1]]>');
assert.equal(verifyWechatNotify(cdBad, apiKey).ok, false, '篡改 CDATA 内金额应验签失败');

// ── 支付宝响应节点原文验签（含嵌套对象与转义引号，不得重新序列化）──
const nodeRaw =
  '{"code":"10000","msg":"Success","out_trade_no":"o9","trade_status":"TRADE_SUCCESS","total_amount":"29.90","nested":{"a":"x\\"y"},"subject":"s"}';
const rawSigner = crypto.createSign('RSA-SHA256');
rawSigner.update(nodeRaw, 'utf8');
const rawSign = rawSigner.sign(privPem, 'base64');
assert.ok(verifyAlipayRawSign(nodeRaw, pubPem, rawSign), '支付宝响应原文应验签通过');
assert.ok(!verifyAlipayRawSign(nodeRaw.replace('29.90', '0.01'), pubPem, rawSign), '篡改金额应验签失败');
assert.ok(!verifyAlipayRawSign(nodeRaw, pubPem, 'not-base64!!'), '非法签名应返回 false 而非抛错');

console.log('payments signature tests passed');
