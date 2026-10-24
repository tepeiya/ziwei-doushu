/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  serverExternalPackages: ['@prisma/client', 'ioredis'],
};

module.exports = nextConfig;
