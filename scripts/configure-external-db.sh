#!/bin/bash

# ==================================================
# 配置外部数据库连接脚本
# ==================================================

echo "=================================="
echo "  配置外部数据库连接"
echo "=================================="
echo ""

# 获取 DM8 连接信息
read -p "请输入 DM8 数据库 IP 地址: " DM8_HOST
read -p "请输入 DM8 数据库端口 (默认 5236): " DM8_PORT
DM8_PORT=${DM8_PORT:-5236}
read -p "请输入 DM8 数据库用户名 (默认 SYSDBA): " DM8_USER
DM8_USER=${DM8_USER:-SYSDBA}
read -sp "请输入 DM8 数据库密码: " DM8_PASS
echo ""

# 获取 TongRDS 连接信息
read -p "请输入 TongRDS (Redis) IP 地址: " REDIS_HOST
read -p "请输入 TongRDS 端口 (默认 6379): " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}
read -sp "请输入 TongRDS 密码 (如果没有密码直接回车): " REDIS_PASS
echo ""

# 构建连接字符串
DATABASE_URL="dm://${DM8_USER}:${DM8_PASS}@${DM8_HOST}:${DM8_PORT}"

# 创建 .env 文件
cat > .env << EOF
# ==================================================
# 数据库连接配置
# 生成时间: $(date)
# ==================================================

# 数据库类型
DB_TYPE=dm8

# DM8 数据库连接
DATABASE_URL=${DATABASE_URL}

# TongRDS (Redis) 连接
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_AUTH=${REDIS_PASS}

# Next Auth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=secret

# Langfuse Configuration
LANGFUSE_ENABLE_EXPERIMENTAL_FEATURES=true

# Security Configuration
SALT=salt
LANGFUSE_WORKER_PASSWORD=mybasicauthsecret
ENCRYPTION_KEY=8f94183ebc9cd0702323781700473ec7778adf21c7faf9a25c9c19239d936974

# Node Environment
NODE_ENV=development
EOF

echo ""
echo "✅ 配置文件已生成: .env"
echo ""
echo "配置信息:"
echo "  DM8: ${DM8_HOST}:${DM8_PORT} (用户: ${DM8_USER})"
echo "  TongRDS: ${REDIS_HOST}:${REDIS_PORT}"
echo ""
echo "下一步:"
echo "  1. 测试连接: npx ts-node scripts/test-external-db-connection.ts"
echo "  2. 启动服务: pnpm run dev"
echo ""
