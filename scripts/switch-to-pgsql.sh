#!/bin/bash
# 切换到 PostgreSQL + Redis 配置

echo "🔄 切换到 PostgreSQL + Redis 配置..."

# 备份当前配置
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d%H%M%S)
    echo "✅ 已备份当前配置"
fi

# 创建 PostgreSQL 配置
cat > .env << 'EOF'
# PostgreSQL Database Configuration
DB_TYPE=postgresql
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/langfuse

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_AUTH=

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

echo "✅ 已创建 PostgreSQL 配置"
echo ""
echo "📋 配置内容："
echo "   DB_TYPE: postgresql"
echo "   DATABASE_URL: postgresql://postgres:postgres@localhost:5432/langfuse"
echo "   REDIS_HOST: localhost"
echo "   REDIS_PORT: 6379"
echo ""
echo "⚠️  请确保："
echo "   1. PostgreSQL 服务已启动"
echo "   2. Redis 服务已启动"
echo "   3. 数据库 'langfuse' 已创建"
echo ""
echo "🚀 启动服务: pnpm run dev"
