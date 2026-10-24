/**
 * NextAuth (Auth.js v4) 配置
 * 采用 Credentials（账号密码）策略 + JWT session，无需数据库适配器。
 * 用户校验通过 lib/db 完成。
 */
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByIdentifier, verifyPassword } from '@/lib/db';

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
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const user = await findUserByIdentifier(credentials.identifier.trim());
        if (!user || !user.passwordHash) return null;
        const ok = verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
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
