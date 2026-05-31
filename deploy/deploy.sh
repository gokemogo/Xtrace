#!/bin/bash

# ==================================================
# DeepTrace 一键部署脚本
# ==================================================

set -e

echo "=========================================="
echo "  DeepTrace 一键部署脚本"
echo "  包含：DeepTrace + DM8 + TongRDS"
echo "=========================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker 未安装"
    echo "请先安装 Docker：https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ 错误：Docker Compose 未安装"
    echo "请先安装 Docker Compose：https://docs.docker.com/compose/install/"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，将从模板创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件"
    echo ""
    echo "请编辑 .env 文件，修改以下敏感配置："
    echo "  - DM8_PASSWORD: DM8 数据库密码"
    echo "  - REDIS_PASSWORD: TongRDS 密码（可选）"
    echo "  - NEXTAUTH_SECRET: NextAuth 密钥"
    echo "  - SALT: 密码盐值"
    echo "  - ENCRYPTION_KEY: 加密密钥"
    echo ""
    read -p "是否现在编辑 .env 文件？(y/n): " edit_env
    if [ "$edit_env" = "y" ] || [ "$edit_env" = "Y" ]; then
        vi .env
    else
        echo "请稍后手动编辑 .env 文件"
        echo "运行：vi .env"
    fi
fi

# 加载环境变量
source .env

echo ""
echo "=========================================="
echo "  部署配置信息"
echo "=========================================="
echo ""
echo "DM8 数据库："
echo "  端口：${DM8_PORT:-5236}"
echo "  密码：${DM8_PASSWORD:0:3}***"
echo ""
echo "TongRDS："
echo "  端口：${REDIS_PORT:-6379}"
echo "  密码：${REDIS_PASSWORD:-（无密码）}"
echo ""
echo "Web 应用："
echo "  端口：${WEB_PORT:-3000}"
echo ""
echo "Worker 服务："
echo "  端口：${WORKER_PORT:-5001}"
echo ""

read -p "确认以上配置？(y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "部署已取消"
    exit 0
fi

echo ""
echo "=========================================="
echo "  开始部署"
echo "=========================================="
echo ""

# 1. 构建镜像
echo "1. 构建 Docker 镜像..."
docker compose -f docker-compose-all.yaml build
echo "   ✅ 镜像构建完成"
echo ""

# 2. 启动服务
echo "2. 启动服务..."
docker compose -f docker-compose-all.yaml up -d
echo "   ✅ 服务已启动"
echo ""

# 3. 等待服务启动
echo "3. 等待服务启动..."
echo "   （DM8 启动较慢，约需 2-3 分钟）"

# 等待 DM8 启动
echo -n "   等待 DM8 启动"
for i in {1..60}; do
    if docker compose -f docker-compose-all.yaml ps dm8 | grep -q "healthy"; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

# 等待 TongRDS 启动
echo -n "   等待 TongRDS 启动"
for i in {1..10}; do
    if docker compose -f docker-compose-all.yaml ps tongrds | grep -q "healthy"; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# 等待 Web 服务启动
echo -n "   等待 Web 服务启动"
for i in {1..30}; do
    if docker compose -f docker-compose-all.yaml ps deeptrace-web | grep -q "healthy"; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

# 4. 检查服务状态
echo ""
echo "4. 检查服务状态..."
docker compose -f docker-compose-all.yaml ps

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  Web 界面：http://localhost:${WEB_PORT:-3000}"
echo "  Worker API：http://localhost:${WORKER_PORT:-5001}"
echo ""
echo "默认登录账号："
echo "  邮箱：administrator@orbitai.com"
echo "  密码：administrator"
echo ""
echo "常用命令："
echo "  查看日志：docker compose -f docker-compose-all.yaml logs -f"
echo "  停止服务：docker compose -f docker-compose-all.yaml down"
echo "  重启服务：docker compose -f docker-compose-all.yaml restart"
echo "  查看状态：docker compose -f docker-compose-all.yaml ps"
echo ""
echo "数据库信息："
echo "  DM8 端口：${DM8_PORT:-5236}"
echo "  TongRDS 端口：${REDIS_PORT:-6379}"
echo ""
echo "如需初始化种子数据（默认用户和项目），运行："
echo "  docker exec -i deeptrace-dm8 /opt/dmdbms/bin/disql SYSDBA/${DM8_PASSWORD} < dm8_seed_data.sql"
echo ""
