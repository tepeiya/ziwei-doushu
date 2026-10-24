/**
 * 轻量数据存储层
 * ─────────────────────────────────────────────────────────────
 * 开发期：内存 + JSON 文件持久化（.data/db.json），零外部依赖即可跑通。
 * 生产期：将 DATABASE_URL 指向 Postgres，并改用 prisma/schema.prisma 中的模型
 *         （见文件底部「生产切换说明」）。本文件接口保持稳定，业务代码无需改动。
 */
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// ─── 数据模型 ───────────────────────────────────────────────
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

interface DBShape {
  users: User[];
  memberships: Membership[];
  charts: SavedChart[];
  orders: Order[];
}

// ─── 密码哈希（演示用 scrypt，生产请接入专业 KMS/OAuth）─────────
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

// ─── JSON 持久化 ─────────────────────────────────────────────
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

// ─── 用户 ───────────────────────────────────────────────────
export async function createUser(identifier: string, password: string, nickname?: string): Promise<User> {
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
  const db = await load();
  return db.users.find((u) => u.identifier === identifier);
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await load();
  return db.users.find((u) => u.id === id);
}

// ─── 会员 ───────────────────────────────────────────────────
const PLAN_DURATION: Record<string, number> = {
  monthly: 30 * 24 * 3600 * 1000,
  yearly: 365 * 24 * 3600 * 1000,
};

export async function getMembership(userId: string): Promise<Membership> {
  const db = await load();
  const m = db.memberships.find((x) => x.userId === userId);
  if (!m) return { userId, plan: 'free', status: 'none', startedAt: 0, expiresAt: 0 };
  if (m.status === 'active' && m.expiresAt < Date.now()) {
    m.status = 'expired';
    await save(db);
  }
  return m;
}

export async function activateMembership(userId: string, plan: 'monthly' | 'yearly'): Promise<Membership> {
  const db = await load();
  const now = Date.now();
  const dur = PLAN_DURATION[plan] ?? PLAN_DURATION.monthly;
  let m = db.memberships.find((x) => x.userId === userId);
  if (!m) {
    m = { userId, plan, status: 'active', startedAt: now, expiresAt: now + dur };
    db.memberships.push(m);
  } else {
    // 续费：从当前到期时间或现在起算
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
  const db = await load();
  return db.charts
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function deleteChart(id: string, userId: string): Promise<boolean> {
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
  const db = await load();
  return db.orders.find((o) => o.id === id);
}

export async function markOrderPaid(id: string, channel?: string): Promise<Order | undefined> {
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

// ─── 生产切换说明 ───────────────────────────────────────────
// 1) 安装 Prisma：`npm i prisma @prisma/client`，执行 `npx prisma migrate dev`。
// 2) 以 prisma/schema.prisma 中的 User/Membership/Chart/Order 模型替换本文件内的
//    数据结构，并保持上述导出函数签名不变，业务层（auth、pay、charts）无需改动。
// 3) 用 DATABASE_URL + PrismaClient 实现 load/save 的各种 find/create/update。
