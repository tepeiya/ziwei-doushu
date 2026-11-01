/**
 * 后台管理员鉴权
 * ─────────────────────────────────────────────────────────────
 * 两种成为管理员的方式（满足其一即可）：
 * 1) 用户 role === 'admin'（后台可在「用户」里授予/回收）
 * 2) 登录账号在环境变量 ADMIN_IDENTIFIERS 白名单中
 *    —— 用于首次引导：无需改库即可让指定账号进入后台。
 *
 * 所有 /api/admin/* 与 /admin 都必须经过 getAdmin() 校验。
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById } from '@/lib/db';

/** ADMIN_IDENTIFIERS：逗号分隔的手机号 / 邮箱。 */
export function adminIdentifiers(): string[] {
  return (process.env.ADMIN_IDENTIFIERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface AdminContext {
  id: string;
  identifier: string;
  nickname?: string;
  via: 'role' | 'env';
}

/** 当前登录用户是否为管理员；否则返回 null。 */
export async function getAdmin(): Promise<AdminContext | null> {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return null;

  const user = await findUserById(uid);
  if (!user) return null;

  if (user.role === 'admin') {
    return { id: user.id, identifier: user.identifier, nickname: user.nickname, via: 'role' };
  }
  if (adminIdentifiers().includes(user.identifier)) {
    return { id: user.id, identifier: user.identifier, nickname: user.nickname, via: 'env' };
  }
  return null;
}

/** API 统一错误响应。 */
export function adminError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
