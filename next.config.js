/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  serverExternalPackages: ['@prisma/client', 'ioredis'],
  // Next 16 默认拦截跨源 dev 资源。通过局域网 IP 访问时若不加白名单，
  // HMR 与部分请求会被 "Blocked cross-origin" 拦掉（表现为改了代码页面不自动更新）。
  // 注意：不支持 '*' 通配，必须填写准确域名（Next 16 限制）。
  // 通过隧道/局域网访问 dev server 时，未登记的域其 /_next/* 会被 403，
  // 表现为「网页能打开但 JS 不加载、页面不渲染」。
  // 正式对外建议改用 `npm run build && npm start`（生产模式无此限制）。
  allowedDevOrigins: [
    'zw.lbzsj.com',            // 公网隧道域名
    '192.168.1.18',            // 局域网直连
    '192.168.1.18:3100',
  ],
};

module.exports = nextConfig;
