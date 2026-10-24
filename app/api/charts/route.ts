import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveChart, listCharts, deleteChart, isMember } from '@/lib/db';

export const runtime = 'nodejs';

async function requireUser() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  return uid ?? null;
}

// 保存命盘（需登录）
export async function POST(req: NextRequest) {
  const uid = await requireUser();
  if (!uid) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: { chart?: unknown; birthInfo?: unknown; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  if (!body.chart) return NextResponse.json({ error: '缺少命盘数据' }, { status: 400 });
  const rec = await saveChart({
    userId: uid,
    birthInfo: body.birthInfo,
    chart: body.chart,
    title: body.title,
  });
  return NextResponse.json({ ok: true, id: rec.id, createdAt: rec.createdAt });
}

// 列出当前用户命盘
export async function GET() {
  const uid = await requireUser();
  if (!uid) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const charts = await listCharts(uid);
  const member = await isMember(uid);
  return NextResponse.json({ charts, isMember: member });
}

// 删除命盘
export async function DELETE(req: NextRequest) {
  const uid = await requireUser();
  if (!uid) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const ok = await deleteChart(id, uid);
  return NextResponse.json({ ok });
}
