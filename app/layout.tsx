import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Providers from '@/components/Providers';
import Disclaimer from '@/components/Disclaimer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: '紫微命盘 · 传统紫微斗数排盘与解读',
  description: '基于传统紫微斗数体系，AI 解读命盘格局与大限流年；内容仅供娱乐参考，不构成医疗或决策建议',
  keywords: '紫微斗数, 紫微斗数全集, 紫微斗数全书, 骨髓赋, 命盘, 命理, 14主星, 12宫位',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '紫微命盘 · 传统紫微斗数排盘与解读',
    description: '基于传统紫微斗数体系，AI 解读命盘格局与大限流年；内容仅供娱乐参考，不构成医疗或决策建议',
    url: SITE_URL,
    siteName: '紫微研究',
    locale: 'zh_CN',
    type: 'website',
  },
  // 站长平台验证（拿到 verification code 后填入对应字段，重新部署即可）
  verification: {
    // Google Search Console: 在 https://search.google.com/search-console 添加站点后获取
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    // Bing Webmaster Tools: 在 https://www.bing.com/webmasters 添加站点后获取
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || '808FFC6023A2C359B375DD860FEDA856',
      // 百度站长（等执照下来后）
      'baidu-site-verification': process.env.NEXT_PUBLIC_BAIDU_VERIFICATION || '',
      // 360 站长（等执照下来后）
      '360-site-verification': process.env.NEXT_PUBLIC_360_VERIFICATION || '',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ziwei-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();` }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
          <Disclaimer />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
