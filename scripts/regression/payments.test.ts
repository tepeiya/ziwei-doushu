import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  wechatSign,
  verifyWechatNotify,
  alipaySign,
  verifyAlipaySign,
} from '../../lib/server/payments';

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
  sign_type: 'RSA2',
  timestamp: '2026-01-01 00:00:00',
  version: '1.0',
  out_trade_no: 'o9',
  total_amount: '1.00',
  subject: 's',
};
const asign = alipaySign(ap, privPem);
assert.ok(verifyAlipaySign(ap, pubPem, asign), '合法支付宝签名应验签通过');
assert.ok(!verifyAlipaySign({ ...ap, out_trade_no: 'o10' }, pubPem, asign), '篡改订单号应验签失败');

console.log('payments signature tests passed');
