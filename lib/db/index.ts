/**
 * 数据存储层（开发态 JSON + 生产态 Postgres 双实现）
 * ─────────────────────────────────────────────────────────────
 * - 未设置 DATABASE_URL：内存 + JSON 文件（.data/db.json），零外部依赖即可跑通。
 * - 设置 DATABASE_URL：使用 Prisma + Postgres（见 prisma/schema.prisma）。
 *
 * 业务层（auth / pay / charts / profile）只依赖本文件导出的函数签名，无需改动。
 *
 * 首次启用 Postgres：
 *   npm install                     # postinstall 自动 prisma generate
 *   npx prisma migrate dev          # 本地建表（会生成 prisma/migrations）
 *   # 生产环境用：npx prisma migrate deploy
 */
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Prisma client 延迟加载：未配置 DATABASE_URL 时绝不触碰（避免未生成 client 报错）。
// 使用 require + any 是为了让「纯 JSON 模式」在无 DATABASE_URL 时也不依赖已生成的 client。
type PrismaClientLike = any;
let _prisma: PrismaClientLike | null = null;
function getPrisma(): PrismaClientLike | null {
  if (!process.env.DATABASE_URL) return null;
  if (!_prisma) {
    const { PrismaClient } = require('@prisma/client');
    _prisma = new PrismaClient();
  }
  return _prisma;
}

// ─── 数据模型（与 JSON 版保持一致，业务层依赖这些类型）───
export type MembershipPlan = 'free' | 'monthly' | 'yearly';

export interface User {
  id: string;
  identifier: string; // 手机号或邮箱，作为登录账号
  passwordHash?: string;
  nickname?: string;
  createdAt: number;
}

export interface Membership {
  userId: string;
  plan: MembershipPlan;
  status: 'active' | 'expired' | 'none';
  startedAt: number;
  expiresAt: number;
}

export interface SavedChart {
  id: string;
  userId: string | null;
  birthInfo: unknown;
  chart: unknown;
  title?: string;
  createdAt: number;
}

export interface Order {
  id: string;
  userId: string | null;
  plan: string; // 'monthly' | 'yearly' | 'single'
  amount: number; // 单位：分
  status: 'pending' | 'paid' | 'closed';
  channel?: string; // 'wechat' | 'alipay' | 'sandbox'
  createdAt: number;
  paidAt?: number;
}

// ─── 密码哈希（演示用 scrypt；生产建议提高迭代轮数或接专业方案）───
export function hashPassword(pwd: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pwd: string, stored?: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const cmp = crypto.scryptSync(pwd, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(cmp));
}

// ─── JSON 持久化（DATABASE_URL 未设置时的 fallback）───
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DBShape {
  users: User[];
  memberships: Membership[];
  charts: SavedChart[];
  orders: Order[];
}

let cache: DBShape | null = null;

async function load(): Promise<DBShape> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    cache = { users: [], memberships: [], charts: [], orders: [] };
  }
  return cache!;
}

async function save(db: DBShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
}

// ─── PG ↔ 业务类型转换（DateTime <-> 毫秒时间戳）───
const toNum = (d: Date | null | undefined): number => (d ? d.getTime() : 0);
function toUser(u: any): User {
  return {
    id: u.id,
    identifier: u.identifier,
    passwordHash: u.passwordHash ?? undefined,
    nickname: u.nickname ?? undefined,
    createdAt: toNum(u.createdAt),
  };
}
function toMembership(m: any): Membership {
  return {
    userId: m.userId,
    plan: m.plan,
    status: m.status,
    startedAt: toNum(m.startedAt),
    expiresAt: toNum(m.expiresAt),
  };
}
function toSavedChart(c: any): SavedChart {
  return {
    id: c.id,
    userId: c.userId,
    birthInfo: c.birthInfo,
    chart: c.chart,
    title: c.title ?? undefined,
    createdAt: toNum(c.createdAt),
  };
}
function toOrder(o: any): Order {
  return {
    id: o.id,
    userId: o.userId,
    plan: o.plan,
    amount: o.amount,
    status: o.status,
    channel: o.channel ?? undefined,
    createdAt: toNum(o.createdAt),
    paidAt: toNum(o.paidAt),
  };
}

const PLAN_DURATION: Record<string, number> = {
  monthly: 30 * 24 * 3600 * 1000,
  yearly: 365 * 24 * 3600 * 1000,
};

// ─── 用户 ───────────────────────────────────────────────────
export async function createUser(
  identifier: string,
  password: string,
  nickname?: string,
): Promise<User> {
  const p = getPrisma();
  if (p) {
    const u = await p.user.create({
      data: {
        identifier,
        passwordHash: hashPassword(password),
        nickname: nickname || identifier,
        createdAt: new Date(),
      },
    });
    return toUser(u);
  }
  const db = await load();
  if (db.users.some((u) => u.identifier === identifier)) {
    throw new Error('ACCOUNT_EXISTS');
  }
  const user: User = {
    id: newId('u'),
    identifier,
    passwordHash: hashPassword(password),
    nickname: nickname || identifier,
    createdAt: Date.now(),
  };
  db.users.push(user);
  await save(db);
  return user;
}

export async function findUserByIdentifier(identifier: string): Promise<User | undefined> {
  const p = getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { identifier } });
    return u ? toUser(u) : undefined;
  }
  const db = await load();
  return db.users.find((u) => u.identifier === identifier);
}

export async function findUserById(id: string): Promise<User | undefined> {
  const p = getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { id } });
    return u ? toUser(u) : undefined;
  }
  const db = await load();
  return db.users.find((u) => u.id === id);
}

// ─── 会员 ───────────────────────────────────────────────────
export async function getMembership(userId: string): Promise<Membership> {
  const p = getPrisma();
  if (p) {
    const m = await p.membership.findUnique({ where: { userId } });
    if (!m) return { userId, plan: 'free', status: 'none', startedAt: 0, expiresAt: 0 };
    if (m.status === 'active' && m.expiresAt.getTime() < Date.now()) {
      const updated = await p.membership.update({ where: { userId }, data: { status: 'expired' } });
      return toMembership(updated);
    }
    return toMembership(m);
  }
  const db = await load();
  const m = db.memberships.find((x) => x.userId === userId);
  if (!m) return { userId, plan: 'free', status: 'none', startedAt: 0, expiresAt: 0 };
  if (m.status === 'active' && m.expiresAt < Date.now()) {
    m.status = 'expired';
    await save(db);
  }
  return m;
}

export async function activateMembership(
  userId: string,
  plan: 'monthly' | 'yearly',
): Promise<Membership> {
  const p = getPrisma();
  const now = Date.now();
  const dur = PLAN_DURATION[plan] ?? PLAN_DURATION.monthly;
  if (p) {
    const existing = await p.membership.findUnique({ where: { userId } });
    const base = existing ? Math.max(existing.expiresAt.getTime(), now) : now;
    const data = {
      plan,
      status: 'active',
      startedAt: new Date(now),
      expiresAt: new Date(base + dur),
    };
    const m = await p.membership.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toMembership(m);
  }
  const db = await load();
  let m = db.memberships.find((x) => x.userId === userId);
  if (!m) {
    m = { userId, plan, status: 'active', startedAt: now, expiresAt: now + dur };
    db.memberships.push(m);
  } else {
    m.plan = plan;
    m.status = 'active';
    m.startedAt = now;
    m.expiresAt = Math.max(m.expiresAt, now) + dur;
  }
  await save(db);
  return m;
}

export async function isMember(userId: string): Promise<boolean> {
  const m = await getMembership(userId);
  return m.status === 'active' && m.expiresAt > Date.now();
}

// ─── 命盘保存 ───────────────────────────────────────────────
export async function saveChart(input: {
  userId: string | null;
  birthInfo: unknown;
  chart: unknown;
  title?: string;
}): Promise<SavedChart> {
  const p = getPrisma();
  if (p) {
    const c = await p.savedChart.create({
      data: {
        userId: input.userId,
        birthInfo: input.birthInfo as any,
        chart: input.chart as any,
        title: input.title,
      },
    });
    return toSavedChart(c);
  }
  const db = await load();
  const rec: SavedChart = {
    id: newId('c'),
    userId: input.userId,
    birthInfo: input.birthInfo,
    chart: input.chart,
    title: input.title,
    createdAt: Date.now(),
  };
  db.charts.push(rec);
  await save(db);
  return rec;
}

export async function listCharts(userId: string, limit = 50): Promise<SavedChart[]> {
  const p = getPrisma();
  if (p) {
    const rows = await p.savedChart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toSavedChart);
  }
  const db = await load();
  return db.charts
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function deleteChart(id: string, userId: string): Promise<boolean> {
  const p = getPrisma();
  if (p) {
    const res = await p.savedChart.deleteMany({ where: { id, userId } });
    return res.count > 0;
  }
  const db = await load();
  const before = db.charts.length;
  db.charts = db.charts.filter((c) => !(c.id === id && c.userId === userId));
  if (db.charts.length !== before) {
    await save(db);
    return true;
  }
  return false;
}

// ─── 订单 ───────────────────────────────────────────────────
export async function createOrder(input: {
  userId: string | null;
  plan: string;
  amount: number;
  channel?: string;
}): Promise<Order> {
  const p = getPrisma();
  if (p) {
    const o = await p.order.create({
      data: {
        userId: input.userId,
        plan: input.plan,
        amount: input.amount,
        channel: input.channel,
        status: 'pending',
      },
    });
    return toOrder(o);
  }
  const db = await load();
  const order: Order = {
    id: newId('o'),
    userId: input.userId,
    plan: input.plan,
    amount: input.amount,
    status: 'pending',
    channel: input.channel,
    createdAt: Date.now(),
  };
  db.orders.push(order);
  await save(db);
  return order;
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const p = getPrisma();
  if (p) {
    const o = await p.order.findUnique({ where: { id } });
    return o ? toOrder(o) : undefined;
  }
  const db = await load();
  return db.orders.find((o) => o.id === id);
}

export async function markOrderPaid(id: string, channel?: string): Promise<Order | undefined> {
  const p = getPrisma();
  if (p) {
    const o = await p.order.findUnique({ where: { id } });
    if (!o || o.status === 'paid') return o ? toOrder(o) : undefined;
    const updated = await p.order.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date(), ...(channel ? { channel } : {}) },
    });
    if (updated.userId && (updated.plan === 'monthly' || updated.plan === 'yearly')) {
      await activateMembership(updated.userId, updated.plan);
    }
    return toOrder(updated);
  }
  const db = await load();
  const o = db.orders.find((x) => x.id === id);
  if (!o || o.status === 'paid') return o;
  o.status = 'paid';
  o.paidAt = Date.now();
  if (channel) o.channel = channel;
  await save(db);
  if (o.userId && (o.plan === 'monthly' || o.plan === 'yearly')) {
    await activateMembership(o.userId, o.plan as 'monthly' | 'yearly');
  }
  return o;
}
