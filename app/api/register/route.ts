import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '');
    const nickname = body.nickname ? String(body.nickname).trim() : undefined;

    if (!identifier || !password) {
      return NextResponse.json({ error: '请填写账号和密码' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }
    // 简易账号格式校验：手机号或邮箱
    const isPhone = /^1[3-9]\d{9}$/.test(identifier);
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier);
    if (!isPhone && !isEmail) {
      return NextResponse.json({ error: '账号需为手机号或邮箱' }, { status: 400 });
    }

    const user = await createUser(identifier, password, nickname);
    return NextResponse.json({ ok: true, id: user.id, identifier: user.identifier });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'ACCOUNT_EXISTS') {
      return NextResponse.json({ error: '该账号已注册，请直接登录' }, { status: 409 });
    }
    return NextResponse.json({ error: '注册失败，请稍后再试' }, { status: 500 });
  }
}
