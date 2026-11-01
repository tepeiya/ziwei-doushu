'use client';
import { useCallback, useEffect, useState } from 'react';

type Tab = 'overview' | 'members' | 'settings' | 'payment' | 'orders';

interface PayGroup {
  appId?: string;
  mchId?: string;
  apiKey?: string;
  privateKey?: string;
  publicKey?: string;
  configured?: boolean;
}
interface PayInfo {
  channel: string;
  effectiveChannel: string;
  customised?: boolean;
  wechat?: PayGroup;
  alipay?: PayGroup;
}

interface Overview {
  users: number;
  activeMembers: number;
  orders: number;
  paidOrders: number;
  revenueFen: number;
  trialLimit: number;
  settingsUpdatedAt: number | null;
  admin: { id: string; identifier: string; via: string };
}
interface MemberRow {
  id: string;
  identifier: string;
  nickname: string;
  role: string;
  createdAt: number;
  plan: string;
  status: string;
  expiresAt: number;
  isActive: boolean;
  trialUsed: number;
}
interface OrderRow {
  id: string;
  userId: string | null;
  plan: string;
  amount: number;
  status: string;
  channel?: string;
  createdAt: number;
  paidAt?: number;
}
interface PlanEditable {
  id: string;
  name: string;
  priceFen: number;
  durationDays: number;
  enabled: boolean;
}
interface SettingsResp {
  settings: { trialUses: number; plans?: Record<string, Partial<PlanEditable>>; updatedAt?: number };
  defaults: { id: string; name: string; priceFen: number }[];
  payment?: PayInfo;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  return data as T;
}

const fmtDate = (ms?: number | null) => (ms ? new Date(ms).toLocaleString('zh-CN') : '—');
const fmtYuan = (fen: number) => `¥${(fen / 100).toFixed(fen % 100 === 0 ? 0 : 2)}`;

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--bdr)',
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
};
const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--tx-3)',
  fontWeight: 500,
  padding: '8px 10px',
  borderBottom: '1px solid var(--bdr)',
};
const td: React.CSSProperties = { fontSize: 12, color: 'var(--tx-2)', padding: '10px' };
const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 'var(--r-pill)',
  border: 'none',
  background: 'linear-gradient(135deg,#9a6210,#c88020)',
  color: '#fff8e8',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--r-pill)',
  border: '1px solid var(--bdr-med)',
  background: 'transparent',
  color: 'var(--tx-2)',
  fontSize: 12,
  cursor: 'pointer',
};
const input: React.CSSProperties = {
  background: 'var(--bg-0)',
  border: '1px solid var(--bdr)',
  borderRadius: 8,
  color: 'var(--tx-0)',
  fontSize: 13,
  padding: '7px 10px',
  outline: 'none',
};

export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>('overview');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [trialUses, setTrialUses] = useState(3);
  const [plans, setPlans] = useState<PlanEditable[]>([]);
  const [payChannel, setPayChannel] = useState<'auto' | 'sandbox' | 'wechat' | 'alipay'>('auto');
  const [payInfo, setPayInfo] = useState<PayInfo | null>(null);
  // 密钥输入框：留空表示「保持不变」，填写则覆盖
  const [payForm, setPayForm] = useState<Record<string, string>>({});

  const notify = useCallback((text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }, []);

  const loadOverview = useCallback(async () => {
    const d = await api<Overview>('/api/admin/overview');
    setOverview(d);
  }, []);

  const loadMembers = useCallback(async () => {
    const d = await api<{ members: MemberRow[] }>('/api/admin/members');
    setMembers(d.members);
  }, []);

  const loadOrders = useCallback(async () => {
    const d = await api<{ orders: OrderRow[] }>('/api/admin/orders');
    setOrders(d.orders);
  }, []);

  const loadSettings = useCallback(async () => {
    const d = await api<SettingsResp>('/api/admin/settings');
    setTrialUses(d.settings.trialUses);
    if (d.payment) {
      setPayInfo(d.payment);
      setPayChannel((d.payment.channel as 'auto' | 'sandbox' | 'wechat' | 'alipay') ?? 'auto');
    }
    setPayForm({});
    const defaults = d.defaults ?? [];
    setPlans(
      defaults.map((p) => {
        const ov = d.settings.plans?.[p.id] ?? {};
        return {
          id: p.id,
          name: ov.name ?? p.name,
          priceFen: ov.priceFen ?? p.priceFen,
          durationDays: ov.durationDays ?? (p.id === 'yearly' ? 365 : p.id === 'monthly' ? 30 : 0),
          enabled: ov.enabled ?? true,
        };
      }),
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadOverview(), loadMembers(), loadSettings(), loadOrders()]);
      } catch (e) {
        notify((e as Error).message, false);
      }
    })();
  }, [loadOverview, loadMembers, loadSettings, loadOrders, notify]);

  async function memberAction(userId: string, action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    try {
      await api('/api/admin/membership', {
        method: 'POST',
        body: JSON.stringify({ userId, action, ...extra }),
      });
      notify('操作成功');
      await Promise.all([loadMembers(), loadOverview()]);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    try {
      const payload = {
        trialUses: Number(trialUses),
        plans: Object.fromEntries(
          plans.map((p) => [p.id, { name: p.name, priceFen: Number(p.priceFen), durationDays: Number(p.durationDays), enabled: p.enabled }]),
        ),
      };
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
      notify('设置已保存，立即生效');
      await Promise.all([loadSettings(), loadOverview()]);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(false);
    }
  }

  async function savePayment() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { channel: payChannel };
      for (const [k, v] of Object.entries(payForm)) {
        if (typeof v === 'string' && v.trim() !== '') payload[k] = v.trim();
      }
      const d = await api<{ payment?: PayInfo }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ payment: payload }),
      });
      if (d.payment) setPayInfo(d.payment);
      setPayForm({});
      notify('支付配置已保存，立即生效');
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'members', label: '会员管理' },
    { key: 'settings', label: '套餐与试用' },
    { key: 'payment', label: '支付配置' },
    { key: 'orders', label: '订单' },
  ];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx-0)', letterSpacing: '0.1em', marginBottom: 4 }}>
        系统管理
      </h1>
      <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 20 }}>
        {overview ? `管理员：${overview.admin.identifier}（${overview.admin.via === 'role' ? '角色' : '白名单'}）` : '加载中…'}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...btnGhost,
              background: tab === t.key ? 'rgba(212,168,67,0.12)' : 'transparent',
              color: tab === t.key ? 'var(--ac)' : 'var(--tx-3)',
              borderColor: tab === t.key ? 'rgba(212,168,67,0.35)' : 'var(--bdr-med)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div
          style={{
            ...card,
            padding: '10px 16px',
            fontSize: 12,
            color: msg.ok ? '#16a34a' : '#dc2626',
            borderColor: msg.ok ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)',
          }}
        >
          {msg.text}
        </div>
      )}

      {/* 概览 */}
      {tab === 'overview' && overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          {[
            { label: '注册用户', value: overview.users },
            { label: '有效会员', value: overview.activeMembers },
            { label: '订单总数', value: overview.orders },
            { label: '已支付', value: overview.paidOrders },
            { label: '收入', value: fmtYuan(overview.revenueFen) },
            { label: '试用额度', value: `${overview.trialLimit} 次` },
          ].map((s) => (
            <div key={s.label} style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ac)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 会员管理 */}
      {tab === 'members' && (
        <div style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>账号</th>
                  <th style={th}>角色</th>
                  <th style={th}>会员</th>
                  <th style={th}>有效期至</th>
                  <th style={th}>试用已用</th>
                  <th style={th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--bdr)' }}>
                    <td style={td}>
                      {m.identifier}
                      {m.nickname && <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>{m.nickname}</div>}
                    </td>
                    <td style={td}>{m.role === 'admin' ? '管理员' : '普通'}</td>
                    <td style={td}>
                      <span style={{ color: m.isActive ? 'var(--ac)' : 'var(--tx-3)' }}>
                        {m.isActive ? (m.plan === 'yearly' ? '年卡' : '月卡') : '无'}
                      </span>
                    </td>
                    <td style={td}>{fmtDate(m.expiresAt)}</td>
                    <td style={td}>{m.trialUsed}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button disabled={busy} style={btnPrimary} onClick={() => memberAction(m.id, 'grant', { plan: 'monthly' })}>
                          开通月卡
                        </button>
                        <button disabled={busy} style={btnPrimary} onClick={() => memberAction(m.id, 'grant', { plan: 'yearly' })}>
                          开通年卡
                        </button>
                        <button disabled={busy} style={btnGhost} onClick={() => memberAction(m.id, 'revoke')}>
                          撤销
                        </button>
                        <button
                          disabled={busy}
                          style={btnGhost}
                          onClick={() => memberAction(m.id, 'role', { role: m.role === 'admin' ? 'user' : 'admin' })}
                        >
                          {m.role === 'admin' ? '取消管理员' : '设为管理员'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td style={td} colSpan={6}>暂无用户</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 套餐与试用 */}
      {tab === 'settings' && (
        <>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 12 }}>
              非会员的免费 AI 解读次数（含游客，与年度运势共用额度）
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                min={0}
                value={trialUses}
                onChange={(e) => setTrialUses(Number(e.target.value))}
                style={{ ...input, width: 120 }}
              />
              <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>次</span>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 14 }}>套餐配置（价格单位：元；时长单位：天）</div>
            {plans.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: '12px 0',
                  borderTop: i ? '1px solid var(--bdr)' : 'none',
                }}
              >
                <span style={{ width: 64, fontSize: 12, color: 'var(--tx-2)' }}>{p.id}</span>
                <input
                  value={p.name}
                  onChange={(e) => setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                  style={{ ...input, width: 110 }}
                  placeholder="名称"
                />
                <input
                  type="number"
                  min={0}
                  value={(p.priceFen / 100).toFixed(2)}
                  onChange={(e) =>
                    setPlans((prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, priceFen: Math.round(Number(e.target.value) * 100) } : x)),
                    )
                  }
                  style={{ ...input, width: 100 }}
                  placeholder="价格(元)"
                />
                <input
                  type="number"
                  min={0}
                  value={p.durationDays}
                  onChange={(e) =>
                    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, durationDays: Number(e.target.value) } : x)))
                  }
                  style={{ ...input, width: 90 }}
                  placeholder="时长(天)"
                />
                <label style={{ fontSize: 12, color: 'var(--tx-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) =>
                      setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: e.target.checked } : x)))
                    }
                  />
                  上架
                </label>
              </div>
            ))}
          </div>

          <button disabled={busy} style={btnPrimary} onClick={saveSettings}>
            {busy ? '保存中…' : '保存设置'}
          </button>
        </>
      )}

      {/* 支付配置 */}
      {tab === 'payment' && (
        <>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 12 }}>
              当前生效渠道：
              <b style={{ color: 'var(--ac)' }}>
                {payInfo?.effectiveChannel === 'wechat'
                  ? '微信支付'
                  : payInfo?.effectiveChannel === 'alipay'
                    ? '支付宝'
                    : '沙箱模拟'}
              </b>
              {payInfo?.customised ? '（来自后台设置）' : '（来自环境变量）'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 8 }}>渠道模式</div>
            <select
              value={payChannel}
              onChange={(e) => setPayChannel(e.target.value as typeof payChannel)}
              style={{ ...input, width: 260 }}
            >
              <option value="auto">自动（按已配置凭据选择）</option>
              <option value="sandbox">强制沙箱（关闭真实支付）</option>
              <option value="wechat">微信支付</option>
              <option value="alipay">支付宝</option>
            </select>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 14 }}>
              微信支付 · 留空表示保持原值（密钥保存后不可查看，只能覆盖）
            </div>
            {[
              { key: 'wechatAppId', label: 'AppID', cur: payInfo?.wechat?.appId },
              { key: 'wechatMchId', label: '商户号 MCH_ID', cur: payInfo?.wechat?.mchId },
              { key: 'wechatApiKey', label: 'API 密钥', cur: payInfo?.wechat?.apiKey },
            ].map((f) => (
              <div
                key={f.key}
                style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}
              >
                <span style={{ width: 130, fontSize: 12, color: 'var(--tx-2)' }}>{f.label}</span>
                <span style={{ fontSize: 11, color: 'var(--tx-3)', minWidth: 140 }}>
                  {f.cur ? `当前 ${f.cur}` : '未配置'}
                </span>
                <input
                  type="password"
                  value={payForm[f.key] ?? ''}
                  onChange={(e) => setPayForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...input, flex: 1, minWidth: 180 }}
                  placeholder="留空保持不变"
                />
              </div>
            ))}
            <div style={{ fontSize: 11, color: payInfo?.wechat?.configured ? '#16a34a' : 'var(--tx-3)' }}>
              微信凭据{payInfo?.wechat?.configured ? '已完整配置' : '不完整（将回退沙箱）'}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 14 }}>
              支付宝 · 应用私钥需为 PKCS8 格式
            </div>
            {[
              { key: 'alipayAppId', label: 'AppID', cur: payInfo?.alipay?.appId },
              { key: 'alipayPrivateKey', label: '应用私钥', cur: payInfo?.alipay?.privateKey },
              { key: 'alipayPublicKey', label: '支付宝公钥', cur: payInfo?.alipay?.publicKey },
            ].map((f) => (
              <div
                key={f.key}
                style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}
              >
                <span style={{ width: 130, fontSize: 12, color: 'var(--tx-2)' }}>{f.label}</span>
                <span style={{ fontSize: 11, color: 'var(--tx-3)', minWidth: 140 }}>
                  {f.cur ? `当前 ${f.cur}` : '未配置'}
                </span>
                <input
                  type="password"
                  value={payForm[f.key] ?? ''}
                  onChange={(e) => setPayForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...input, flex: 1, minWidth: 180 }}
                  placeholder="留空保持不变"
                />
              </div>
            ))}
            <div style={{ fontSize: 11, color: payInfo?.alipay?.configured ? '#16a34a' : 'var(--tx-3)' }}>
              支付宝凭据{payInfo?.alipay?.configured ? '已完整配置' : '不完整（将回退沙箱）'}
            </div>
          </div>

          <button disabled={busy} style={btnPrimary} onClick={savePayment}>
            {busy ? '保存中…' : '保存支付配置'}
          </button>
        </>
      )}

      {/* 订单 */}
      {tab === 'orders' && (
        <div style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>订单号</th>
                  <th style={th}>套餐</th>
                  <th style={th}>金额</th>
                  <th style={th}>状态</th>
                  <th style={th}>渠道</th>
                  <th style={th}>时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--bdr)' }}>
                    <td style={td}>{o.id}</td>
                    <td style={td}>{o.plan}</td>
                    <td style={td}>{fmtYuan(o.amount)}</td>
                    <td style={td}>
                      <span style={{ color: o.status === 'paid' ? 'var(--ac)' : 'var(--tx-3)' }}>
                        {o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已关闭'}
                      </span>
                    </td>
                    <td style={td}>{o.channel ?? '—'}</td>
                    <td style={td}>{fmtDate(o.paidAt ?? o.createdAt)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td style={td} colSpan={6}>暂无订单</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
