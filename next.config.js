/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  serverExternalPackages: ['@prisma/client'],
};

module.exports = nextConfig;
