# ── 多阶段构建：Next.js 16 (App Router) ──
# 基础镜像要求 Node >= 20.9（Next 16 已放弃 Node 18）
FROM node:20-alpine AS base
WORKDIR /app

# 1) 依赖安装：必须带上 .npmrc（内含 legacy-peer-deps=true）
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

# 2) 构建
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 3) 运行（非 root 用户）
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/.npmrc ./.npmrc
# 运行期数据目录（JSON 模式持久化用；切 PG 后可删除该卷）
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
