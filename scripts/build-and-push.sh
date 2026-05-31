#!/bin/bash

# ==================================================
# DeepTrace 镜像打包脚本
# ==================================================

set -e

echo "=========================================="
echo "  DeepTrace 镜像打包脚本"
echo "=========================================="
echo ""

# 配置
IMAGE_NAME="deeptrace"
IMAGE_TAG="${1:-latest}"
OUTPUT_FILE="deeptrace-${IMAGE_TAG}.tar.gz"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker 未安装"
    exit 1
fi

echo "配置信息："
echo "  镜像名称：${IMAGE_NAME}:${IMAGE_TAG}"
echo "  输出文件：${OUTPUT_FILE}"
echo ""

# 1. 构建镜像
echo "1. 构建 Docker 镜像..."
docker build -f Dockerfile.dm8 -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "   ✅ 镜像构建完成"
echo ""

# 2. 导出镜像
echo "2. 导出镜像为文件..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${OUTPUT_FILE}
echo "   ✅ 镜像导出完成：${OUTPUT_FILE}"
echo ""

# 3. 显示文件信息
echo "3. 文件信息："
ls -lh ${OUTPUT_FILE}
echo ""

echo "=========================================="
echo "  打包完成！"
echo "=========================================="
echo ""
echo "接下来："
echo "  1. 将 ${OUTPUT_FILE} 传输到部署服务器"
echo "  2. 将 deploy/docker-compose.yaml 传输到部署服务器"
echo "  3. 将 deploy/.env.example 传输到部署服务器"
echo "  4. 在部署服务器上执行："
echo "     docker load < ${OUTPUT_FILE}"
echo "     cp .env.example .env"
echo "     vi .env  # 修改配置"
echo "     docker compose up -d"
echo ""
