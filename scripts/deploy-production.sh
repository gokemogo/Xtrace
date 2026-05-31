#!/bin/bash

# ==================================================
# DeepTrace 生产模式部署脚本
# ==================================================

set -e

echo "=========================================="
echo "  DeepTrace 生产模式部署"
echo "=========================================="
echo ""

# 配置
APP_NAME="deeptrace"
APP_PORT=${1:-3000}
WORKER_PORT=${2:-5001}

# 检查环境
if [ ! -f ".env" ]; then
    echo "❌ 错误：.env 文件不存在"
    echo "请先配置 .env 文件"
    exit 1
fi

# 加载环境变量
source .env

echo "配置信息："
echo "  Web 端口：$APP_PORT"
echo "  Worker 端口：$WORKER_PORT"
echo "  数据库类型：$DB_TYPE"
echo ""

# 1. 停止现有服务
echo "1. 停止现有服务..."
pkill -f "next" 2>/dev/null || true
pkill -f "node worker" 2>/dev/null || true
sleep 2
echo "   ✅ 服务已停止"

# 2. 清理旧的构建文件
echo ""
echo "2. 清理旧的构建文件..."
rm -rf web/.next
rm -rf worker/dist
rm -rf packages/shared/dist
echo "   ✅ 清理完成"

# 3. 构建项目
echo ""
echo "3. 构建项目（生产模式）..."
echo "   这可能需要几分钟时间..."
export NODE_OPTIONS="--max-old-space-size=4096"
export NODE_ENV=production

# 构建 shared 包
echo "   构建 shared 包..."
cd packages/shared && pnpm run build && cd ../..

# 构建 worker 包
echo "   构建 worker 包..."
cd worker && pnpm run build && cd ..

# 构建 web 包
echo "   构建 web 包..."
cd web && pnpm run build && cd ..

echo "   ✅ 构建完成"

# 4. 启动 Worker 服务
echo ""
echo "4. 启动 Worker 服务..."
cd worker
nohup node dist/app.js > /tmp/worker.log 2>&1 &
WORKER_PID=$!
echo "   Worker PID: $WORKER_PID"
cd ..

# 等待 Worker 启动
sleep 5

# 5. 启动 Web 服务
echo ""
echo "5. 启动 Web 服务..."
cd web
nohup node server.js > /tmp/web.log 2>&1 &
WEB_PID=$!
echo "   Web PID: $WEB_PID"
cd ..

# 等待 Web 启动
sleep 10

# 6. 检查服务状态
echo ""
echo "6. 检查服务状态..."

# 检查 Worker
if kill -0 $WORKER_PID 2>/dev/null; then
    echo "   ✅ Worker 服务运行正常 (PID: $WORKER_PID)"
else
    echo "   ❌ Worker 服务启动失败"
    exit 1
fi

# 检查 Web
if kill -0 $WEB_PID 2>/dev/null; then
    echo "   ✅ Web 服务运行正常 (PID: $WEB_PID)"
else
    echo "   ❌ Web 服务启动失败"
    exit 1
fi

# 检查健康状态
echo ""
echo "7. 检查健康状态..."
sleep 5
HEALTH_CHECK=$(curl -s http://localhost:$APP_PORT/api/public/health 2>/dev/null || echo "FAILED")
if echo "$HEALTH_CHECK" | grep -q "OK"; then
    echo "   ✅ 健康检查通过"
else
    echo "   ⚠️  健康检查未通过，可能需要等待更长时间"
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  Web 界面：http://localhost:$APP_PORT"
echo "  Worker API：http://localhost:$WORKER_PORT"
echo ""
echo "日志文件："
echo "  Web：/tmp/web.log"
echo "  Worker：/tmp/worker.log"
echo ""
echo "常用命令："
echo "  查看 Web 日志：tail -f /tmp/web.log"
echo "  查看 Worker 日志：tail -f /tmp/worker.log"
echo "  停止服务：pkill -f 'next\\|node worker'"
echo "  重启服务：$0"
echo ""
echo "性能优化建议："
echo "  1. 使用 PM2 管理进程（推荐）"
echo "  2. 配置 Nginx 反向代理"
echo "  3. 启用 Gzip 压缩"
echo "  4. 配置 CDN 加速静态资源"
echo ""

# 保存 PID 文件
echo "$WEB_PID" > /tmp/deeptrace-web.pid
echo "$WORKER_PID" > /tmp/deeptrace-worker.pid
