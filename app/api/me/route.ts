import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdmin } from '@/lib/admin';
import { isMember } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 当前登录者身份：是否已登录、是否管理员、是否会员。 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ loggedIn: false, isAdmin: false, isMember: false });

  const admin = await getAdmin();
  return NextResponse.json({
    loggedIn: true,
    isAdmin: !!admin,
    isMember: await isMember(uid),
  });
}
