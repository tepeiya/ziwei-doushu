/**
 * 支付对账回归：主动查单 / 超时关单 / 游客试用计数合并
 * 全程在临时目录里跑 JSON 存储，绝不触碰项目 .data/db.json。
 *
 * 注意：所有运行时 import 必须在 chdir 之后动态执行 —— lib/db 的存储路径在模块
 * 加载时按 cwd 定死，而 lib/server/payments 会经 payment-config 间接拉起 lib/db。
 * 静态 import 会让存储路径锁在项目目录上，把测试数据写进真实库。
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PaymentConfig } from '../../lib/payment-config';

const apiKey = 'test_wechat_api_key_1234567890';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const cfg: PaymentConfig = {
  channel: 'auto',
  wechatAppId: 'wx123',
  wechatMchId: 'm1',
  wechatApiKey: apiKey,
  alipayAppId: 'a1',
  alipayPrivateKey: privPem,
  alipayPublicKey: pubPem,
};

const realFetch = globalThis.fetch;
const realNow = Date.now;
let fetchCalls = 0;

function stubFetchCapture(body: string): { last: () => string } {
  let sent = '';
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    fetchCalls += 1;
    sent = init?.body ?? '';
    return new Response(body, { status: 200 });
  }) as typeof fetch;
  return { last: () => sent };
}
function stubFetch(body: string): void {
  stubFetchCapture(body);
}
function stubFetchFail(): void {
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('network down');
  }) as typeof fetch;
}
function stubFetchForbidden(): void {
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('不应发起网关请求');
  }) as typeof fetch;
}

const wxQuery = (over: Record<string, string> = {}): Record<string, string> => ({
  return_code: 'SUCCESS',
  result_code: 'SUCCESS',
  appid: 'wx123',
  mch_id: 'm1',
  nonce_str: 'n',
  out_trade_no: 'q1',
  total_fee: '2990',
  trade_state: 'SUCCESS',
  ...over,
});

/** 支付宝应答：对节点 JSON 原文签名 */
function alipayBody(node: Record<string, unknown>, tamper = false): string {
  const raw = JSON.stringify(node);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(raw, 'utf8');
  const sign = signer.sign(privPem, 'base64');
  const payload = tamper ? raw.replace('"29.90"', '"0.01"') : raw;
  return `{"alipay_trade_query_response":${payload},"sign":"${sign}"}`;
}

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ziwei-reconcile-'));
  const prevCwd = process.cwd();
  process.chdir(tmp);
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;

  const db = await import('../../lib/db');
  const pay = await import('../../lib/server/payments');
  const { reconcileOrder, ORDER_TTL_MS } = await import('../../lib/server/reconcile');

  /** 微信应答：字符串字段包 CDATA，与真实网关一致 */
  const wxBody = (fields: Record<string, string>, sign = true): string => {
    const body = Object.keys(fields)
      .map((k) => `<${k}><![CDATA[${fields[k]}]]></${k}>`)
      .join('');
    const s = sign ? `<sign><![CDATA[${pay.wechatSign(fields, apiKey)}]]></sign>` : '';
    return `<xml>${body}${s}</xml>`;
  };

  const mustGet = async (id: string) => {
    const o = await db.getOrder(id);
    assert.ok(o, `订单 ${id} 应存在`);
    return o;
  };

  try {
    // 安全闸：确认存储真的落在临时目录，否则立刻停手（避免污染项目库）
    const probe = await db.createOrder({ userId: 'probe', plan: 'single', amount: 1, channel: 'sandbox' });
    const tmpDbFile = path.join(tmp, '.data', 'db.json');
    const written = JSON.parse(await fs.readFile(tmpDbFile, 'utf8')) as { orders: { id: string }[] };
    assert.ok(
      written.orders.some((o) => o.id === probe.id),
      '存储未落在临时目录，测试中止以免污染项目数据',
    );
    assert.equal(path.resolve(prevCwd, '.data', 'db.json') === tmpDbFile, false);

    // ── 主动查单：微信 ──
    const cap = stubFetchCapture(wxBody(wxQuery()));
    let q = await pay.queryPayment('q1', 'wechat', cfg);
    assert.equal(q.ok, true, '合法查单应答应可信');
    assert.equal(q.paid, true, 'trade_state=SUCCESS 应判定已付款');
    assert.equal(q.amountFen, 2990);
    // 出站请求本身也要正确签名，否则网关直接拒绝（用自己的验签器回验）
    const sent = pay.verifyWechatNotify(cap.last(), apiKey, { appId: 'wx123', mchId: 'm1' });
    assert.equal(sent.ok, true, '查单请求应带正确签名');
    assert.equal(sent.outTradeNo, 'q1');

    stubFetch(wxBody(wxQuery({ trade_state: 'NOTPAY' })));
    q = await pay.queryPayment('q1', 'wechat', cfg);
    assert.equal(q.ok, true);
    assert.equal(q.paid, false, 'NOTPAY 不得判定已付款');

    stubFetch(wxBody({ return_code: 'SUCCESS', result_code: 'FAIL', err_code: 'ORDERNOTEXIST' }, false));
    q = await pay.queryPayment('q1', 'wechat', cfg);
    assert.equal(q.ok, true, '网关查无此单是可信应答');
    assert.equal(q.paid, false);

    // 先按原字段签名，再改报文里的金额（真正的篡改，签名不再匹配）
    stubFetch(wxBody(wxQuery()).replace('<![CDATA[2990]]>', '<![CDATA[1]]>'));
    q = await pay.queryPayment('q1', 'wechat', cfg);
    assert.equal(q.ok, false, '应答被篡改应判为查不准');

    stubFetch(wxBody(wxQuery({ out_trade_no: 'other' })));
    q = await pay.queryPayment('q1', 'wechat', cfg);
    assert.equal(q.ok, false, '应答订单号与查询不符应拒绝');

    stubFetchFail();
    q = await pay.queryPayment('q1', 'wechat', cfg);
    assert.equal(q.ok, false, '网络失败应判为查不准');

    q = await pay.queryPayment('q1', 'wechat', { ...cfg, wechatApiKey: '' });
    assert.equal(q.ok, false, '未配商户密钥不得查单');

    // ── 主动查单：支付宝 ──
    stubFetch(
      alipayBody({
        code: '10000',
        msg: 'Success',
        out_trade_no: 'q2',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '29.90',
      }),
    );
    q = await pay.queryPayment('q2', 'alipay', cfg);
    assert.equal(q.ok, true, '支付宝原文验签应通过');
    assert.equal(q.paid, true);
    assert.equal(q.amountFen, 2990, '元应折算为分');

    stubFetch(
      alipayBody({ code: '40004', msg: 'Business Failed', sub_code: 'ACQ.TRADE_NOT_EXIST', out_trade_no: 'q2' }),
    );
    q = await pay.queryPayment('q2', 'alipay', cfg);
    assert.equal(q.ok, true, '查无此单是可信应答');
    assert.equal(q.paid, false);

    stubFetch(
      alipayBody({ code: '10000', out_trade_no: 'q2', trade_status: 'WAIT_BUYER_PAY', total_amount: '29.90' }),
    );
    q = await pay.queryPayment('q2', 'alipay', cfg);
    assert.equal(q.ok, true);
    assert.equal(q.paid, false, '等待买家付款不得入账');

    stubFetch(
      alipayBody({ code: '10000', out_trade_no: 'q2', trade_status: 'TRADE_SUCCESS', total_amount: '29.90' }, true),
    );
    q = await pay.queryPayment('q2', 'alipay', cfg);
    assert.equal(q.ok, false, '篡改金额应验签失败');

    stubFetch('{"error_response":{"code":"40002","msg":"Invalid Arguments"}}');
    q = await pay.queryPayment('q2', 'alipay', cfg);
    assert.equal(q.ok, false, '网关错误应答不得当作可信');

    // ── 对账：沙箱超时关单 ──
    fetchCalls = 0;
    const sandbox = await db.createOrder({ userId: 'u1', plan: 'single', amount: 1990, channel: 'sandbox' });
    stubFetchForbidden();
    let r = await reconcileOrder(await mustGet(sandbox.id), cfg);
    assert.equal(r.status, 'pending', '未超时的沙箱订单应保持待支付');
    assert.equal(fetchCalls, 0, '沙箱订单不得请求网关');

    Date.now = () => realNow() + ORDER_TTL_MS + 1000;
    r = await reconcileOrder(await mustGet(sandbox.id), cfg);
    assert.equal(r.status, 'closed', '超时沙箱订单应关单');
    Date.now = realNow;

    // ── 对账：网关确认已付款 → 补入账并发放权益 ──
    const wxOrder = await db.createOrder({ userId: 'u2', plan: 'single', amount: 2990, channel: 'wechat' });
    stubFetch(wxBody(wxQuery({ out_trade_no: wxOrder.id })));
    r = await reconcileOrder(await mustGet(wxOrder.id), cfg);
    assert.equal(r.status, 'paid', '回调丢失时查单应补入账');
    assert.equal(r.channel, 'wechat');
    assert.equal(await db.getBonusUses('u2'), 1, '单次精批入账后应发放 1 次解读额度');

    // ── 对账：金额不符拒绝入账 ──
    const mismatch = await db.createOrder({ userId: 'u3', plan: 'single', amount: 2990, channel: 'wechat' });
    stubFetch(wxBody(wxQuery({ out_trade_no: mismatch.id, total_fee: '1' })));
    r = await reconcileOrder(await mustGet(mismatch.id), cfg);
    assert.equal(r.status, 'pending', '金额不符不得入账');
    assert.equal(await db.getBonusUses('u3'), 0, '金额不符不得发放权益');

    // ── 对账：查不准时保持原状，即使已超时也不关单 ──
    const unknown = await db.createOrder({ userId: 'u4', plan: 'monthly', amount: 2990, channel: 'wechat' });
    stubFetchFail();
    Date.now = () => realNow() + ORDER_TTL_MS + 1000;
    r = await reconcileOrder(await mustGet(unknown.id), cfg);
    assert.equal(r.status, 'pending', '查不准时不得臆断关单（可能已收款）');
    Date.now = realNow;

    // ── 对账：确认未付款且超时 → 关单 ──
    const unpaid = await db.createOrder({ userId: 'u5', plan: 'monthly', amount: 2990, channel: 'wechat' });
    stubFetch(wxBody(wxQuery({ out_trade_no: unpaid.id, trade_state: 'NOTPAY' })));
    Date.now = () => realNow() + ORDER_TTL_MS + 1000;
    r = await reconcileOrder(await mustGet(unpaid.id), cfg);
    assert.equal(r.status, 'closed', '确认未付款且超时应关单');
    Date.now = realNow;

    // ── 对账：已支付 / 已关闭订单是 no-op，不打网关 ──
    stubFetchForbidden();
    const before = fetchCalls;
    r = await reconcileOrder(await mustGet(wxOrder.id), cfg);
    assert.equal(r.status, 'paid');
    r = await reconcileOrder(await mustGet(unpaid.id), cfg);
    assert.equal(r.status, 'closed');
    assert.equal(fetchCalls, before, '终态订单不得再查网关');

    // ── 对账：支付宝渠道同样补入账 ──
    const aliOrder = await db.createOrder({ userId: 'u6', plan: 'single', amount: 2990, channel: 'alipay' });
    stubFetch(
      alipayBody({ code: '10000', out_trade_no: aliOrder.id, trade_status: 'TRADE_SUCCESS', total_amount: '29.90' }),
    );
    r = await reconcileOrder(await mustGet(aliOrder.id), cfg);
    assert.equal(r.status, 'paid', '支付宝查单应补入账');
    assert.equal(await db.getBonusUses('u6'), 1);

    // ── closeOrder 只动 pending ──
    const toClose = await db.createOrder({ userId: 'u7', plan: 'single', amount: 1990, channel: 'sandbox' });
    assert.equal((await db.closeOrder(toClose.id))?.status, 'closed');
    assert.equal((await db.closeOrder(wxOrder.id))?.status, 'paid', '已支付订单不得被关单');
    assert.equal((await db.closeOrder(toClose.id))?.status, 'closed', '重复关单应幂等');
    assert.equal(await db.closeOrder('nope'), undefined);

    // ── 游客试用计数合并：used 取较大值、bonus 累加、重复登录幂等 ──
    await db.incTrial('g_a');
    await db.incTrial('g_a');
    await db.grantTrialUses('g_a', 1);
    await db.incTrial('u_a');
    await db.mergeGuestTrial('g_a', 'u_a');
    assert.equal(await db.getTrialUsed('u_a'), 2, '账号已用次数应取两边较大值');
    assert.equal(await db.getBonusUses('u_a'), 1, '游客付费赠送次数应并入账号');
    assert.equal(await db.getTrialUsed('g_a'), 2, '游客行应镜像账号已用次数');
    assert.equal(await db.getBonusUses('g_a'), 0, '游客赠送次数应清零，避免重复并入');

    await db.mergeGuestTrial('g_a', 'u_a');
    assert.equal(await db.getTrialUsed('u_a'), 2, '重复登录不得重复累加已用次数');
    assert.equal(await db.getBonusUses('u_a'), 1, '重复登录不得重复累加赠送次数');

    // 换个新账号再登录同一游客身份：只继承已用次数，拿不到新的免费额度
    await db.mergeGuestTrial('g_a', 'u_new');
    assert.equal(await db.getTrialUsed('u_new'), 2, '新账号应继承游客已用次数（堵注册刷次数）');
    assert.equal(await db.getBonusUses('u_new'), 0, '赠送次数不得被第二个账号再领一次');

    // 账号已用更多时不被游客计数覆盖
    await db.incTrial('g_b');
    await db.incTrial('u_b');
    await db.incTrial('u_b');
    await db.incTrial('u_b');
    await db.mergeGuestTrial('g_b', 'u_b');
    assert.equal(await db.getTrialUsed('u_b'), 3, '不得把账号已用次数改小');

    // 无游客记录 / 同一身份：no-op
    await db.mergeGuestTrial('g_none', 'u_c');
    assert.equal(await db.getTrialUsed('u_c'), 0);
    await db.incTrial('u_d');
    await db.mergeGuestTrial('u_d', 'u_d');
    assert.equal(await db.getTrialUsed('u_d'), 1);

    console.log('pay reconcile tests passed');
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    process.chdir(prevCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});