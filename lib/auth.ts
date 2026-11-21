/**
 * NextAuth (Auth.js v4) 配置
 * 采用 Credentials（账号密码）策略 + JWT session，无需数据库适配器。
 * 用户校验通过 lib/db 完成。
 */
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByIdentifier, verifyPassword, mergeGuestTrial } from '@/lib/db';
import { GUEST_COOKIE } from '@/lib/billing';
import { validateSecrets } from '@/lib/server/secrets';

// 生产环境密钥校验（开发态仅告警；构建期自动跳过，不阻断打包）。
validateSecrets();

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: '账号密码',
      credentials: {
        identifier: { label: '手机号 / 邮箱', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const user = await findUserByIdentifier(credentials.identifier.trim());
        if (!user || !user.passwordHash) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        // 游客期已用的免费次数并入账号，堵住「用完就注册新号」重置额度。
        // NextAuth 只透传 headers（不含 cookies），故自行解析 Cookie 头。
        try {
          const raw = req?.headers?.cookie;
          const header: string = Array.isArray(raw) ? raw.join('; ') : (raw ?? '');
          const guest = header
            .split(';')
            .map((s) => s.trim())
            .find((s) => s.startsWith(`${GUEST_COOKIE}=`))
            ?.slice(GUEST_COOKIE.length + 1);
          if (guest) await mergeGuestTrial(guest, user.id);
        } catch {
          /* 合并失败不阻断登录 */
        }
        return {
          id: user.id,
          name: user.nickname || user.identifier,
          email: user.identifier.includes('@') ? user.identifier : undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = (user as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
};
