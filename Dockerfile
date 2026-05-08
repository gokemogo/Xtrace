# 基础镜像阶段 - 安装系统依赖
FROM node:20.19.5-alpine AS base

# 更新包索引并安装必要的系统依赖（包括 OpenSSL）
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache libcrypto3 libssl3 libc6-compat busybox ssl_client openssl openssl-dev

# 安装 pnpm（基础镜像中安装）
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm config set registry https://registry.npmmirror.com/ \
    && npm install -g pnpm@9.5.0 \
    && pnpm config set registry https://registry.npmmirror.com/

# 构建阶段 - 安装依赖
FROM base AS deps

# 设置代理和环境变量跳过 puppeteer 下载
ENV HTTP_PROXY=http://192.168.10.128:7890
ENV HTTPS_PROXY=http://192.168.10.128:7890
ENV PUPPETEER_SKIP_DOWNLOAD=true

# 设置工作目录
WORKDIR /app

# 复制所有源码文件
COPY . .

# 安装依赖（使用国内镜像源，跳过 puppeteer）
# 这一层会被缓存，除非包管理文件发生变化
# 修复 SWC 二进制问题 - 安装 musl 版本的 SWC
RUN npm install @next/swc-linux-x64-musl --no-save
RUN pnpm install --frozen-lockfile


RUN cd packages/shared && npx prisma generate

# 设置代理和环境变量
ENV HTTP_PROXY=http://192.168.10.128:7890
ENV HTTPS_PROXY=http://192.168.10.128:7890
ENV PUPPETEER_SKIP_DOWNLOAD=true

# pass public variables in build step | web
ENV DOCKER_BUILD 1
ENV NEXT_MANUAL_SIG_HANDLE true
ENV NEXT_TELEMETRY_DISABLED 1

ARG NEXT_PUBLIC_LANGFUSE_CLOUD_REGION
ARG NEXT_PUBLIC_DEMO_PROJECT_ID
ARG NEXT_PUBLIC_SIGN_UP_DISABLED
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_CRISP_WEBSITE_ID
ARG LANFUSE_WEB_MIGRATION_DISABLED
# 构建应用（deps 阶段已经安装了所有依赖）
RUN pnpm build

# 生产阶段
FROM base AS production

# 清理代理设置
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV PUPPETEER_SKIP_DOWNLOAD=true

# 创建运行环境
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV DOCKER_BUILD 0
ENV NEXT_MANUAL_SIG_HANDLE true

# 设置自定义端口环境变量
ENV PORT=5000
ENV WORKER_PORT=5001

WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# 复制必要的文件
# 复制 package.json 和 pnpm 配置文件
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./
COPY --from=deps --chown=nextjs:nodejs /app/pnpm-lock.yaml ./
COPY --from=deps --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=deps --chown=nextjs:nodejs /app/turbo.json ./

# 复制 web 应用构建输出（Next.js standalone 模式）
COPY --from=deps --chown=nextjs:nodejs /app/web/package.json ./web/package.json
COPY --from=deps --chown=nextjs:nodejs /app/web/next.config.mjs ./web/next.config.mjs
# 关键：复制 Next.js standalone 输出
COPY --from=deps --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=deps --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=deps --chown=nextjs:nodejs /app/web/public ./web/public

# 复制 worker 应用构建输出
COPY --from=deps --chown=nextjs:nodejs /app/worker/package.json ./worker/package.json
COPY --from=deps --chown=nextjs:nodejs /app/worker/dist ./worker/dist

# 复制 shared 包
COPY --from=deps --chown=nextjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps --chown=nextjs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=deps --chown=nextjs:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/packages/shared/prisma ./packages/shared/prisma

# 复制 ee 包（企业版功能）
COPY --from=deps --chown=nextjs:nodejs /app/ee/dist ./ee/dist
COPY --from=deps --chown=nextjs:nodejs /app/ee/package.json ./ee/package.json
COPY --from=deps --chown=nextjs:nodejs /app/ee/node_modules ./ee/node_modules

# 复制配置包（eslint 和 typescript 配置）
COPY --from=deps --chown=nextjs:nodejs /app/packages/config-eslint ./packages/config-eslint
COPY --from=deps --chown=nextjs:nodejs /app/packages/config-typescript ./packages/config-typescript

# 复制 worker 所需的 node_modules 依赖
COPY --from=deps --chown=nextjs:nodejs /app/worker/node_modules ./worker/node_modules
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 5000 5001

CMD ["tail", "-f", "/dev/null"]
