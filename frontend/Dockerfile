# ─────────────────────────────────────────────────────────────
# فایل: frontend/Dockerfile
# Multi-stage build با پشتیبانی میرور ایرانی
# ─────────────────────────────────────────────────────────────

# ══════════════════════════════════════════════════════════════
# Stage 1: Dependencies
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

WORKDIR /app

# ─── تنظیم میرور ایرانی برای npm ─────────────────────────────
# در صورت نیاز این خط را uncomment کن:
# RUN npm config set registry https://registry.npmjs.org/
# یا از آرسس پشتیبانی:
# RUN npm config set registry https://npm.arvancloud.ir/

COPY package.json package-lock.json* ./

# نصب با legacy-peer-deps برای سازگاری
RUN npm ci --legacy-peer-deps

# ══════════════════════════════════════════════════════════════
# Stage 2: Builder
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# متغیرهای build-time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_VERSION

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ══════════════════════════════════════════════════════════════
# Stage 3: Runner (سبک‌ترین ممکن)
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# کاربر غیر-root برای امنیت
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# کپی فایل‌های build شده
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]