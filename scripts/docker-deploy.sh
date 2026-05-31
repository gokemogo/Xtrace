#!/bin/bash

# ==================================================
# Docker Compose 快速部署脚本
# ==================================================

set -e

echo "=================================="
echo "  Langfuse Docker 部署脚本"
echo "=================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，将从模板创建..."
    cp .env.docker .env
    echo "✅ 已创建 .env 文件"
    echo ""
    echo "请编辑 .env 文件，配置数据库连接信息："
    echo "  vi .env"
    echo ""
    echo "然后重新运行此脚本"
    exit 1
fi

# 加载环境变量
source .env

# 检查必要的配置
if [ "$DATABASE_URL" = "dm://SYSDBA:Deeptrace2025@192.168.1.100:5236" ]; then
    echo "⚠️  请先修改 .env 文件中的数据库连接信息"
    echo "当前配置使用的是示例地址"
    echo ""
    echo "请编辑 .env 文件："
    echo "  vi .env"
    echo ""
    echo "修改以下配置："
    echo "  DATABASE_URL=dm://用户名:密码@IP地址:端口"
    echo "  REDIS_HOST=TongRDS的IP地址"
    echo "  REDIS_PORT=TongRDS的端口"
    echo "  REDIS_AUTH=TongRDS的密码"
    exit 1
fi

echo "配置信息："
echo "  DM8: ${DATABASE_URL//:*@/:***@}"
echo "  TongRDS: $REDIS_HOST:$REDIS_PORT"
echo ""

# 构建镜像
echo "1. 构建 Docker 镜像..."
docker compose build

echo ""
echo "2. 启动服务..."
docker compose up -d

echo ""
echo "3. 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "4. 检查服务状态..."
docker compose ps

echo ""
echo "5. 检查健康状态..."
echo "   Web 服务: $(curl -s http://localhost:${WEB_PORT:-3000}/api/public/health 2>/dev/null || echo '等待启动...')"
echo "   Worker 服务: $(curl -s http://localhost:${WORKER_PORT:-3030}/api/health 2>/dev/null || echo '等待启动...')"

echo ""
echo "=================================="
echo "  部署完成！"
echo "=================================="
echo ""
echo "访问地址："
echo "  Web 界面: http://localhost:${WEB_PORT:-3000}"
echo "  Worker API: http://localhost:${WORKER_PORT:-3030}"
echo ""
echo "默认登录账号："
echo "  邮箱: administrator@orbitai.com"
echo "  密码: administrator"
echo ""
echo "常用命令："
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
echo "  重启服务: docker compose restart"
echo ""
