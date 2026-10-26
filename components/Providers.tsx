'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * 客户端 Provider 聚合层。
 * 必须在客户端边界内包裹 SessionProvider，否则在 App Router 的服务端组件
 * 中直接使用 React Context 会抛出 "React Context is unavailable in Server Components"。
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
