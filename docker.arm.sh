#!/bin/bash
set -e

IMAGE_NAME="compass/deeptrace-arm"
IMAGE_TAG="${1:-1.0.0}"
PROXY_URL="http://192.168.10.121:7890"
DOCKERFILE="Dockerfile.arm"

# 设置 Docker 守护进程代理（临时）
export HTTP_PROXY=${PROXY_URL}
export HTTPS_PROXY=${PROXY_URL}

echo "======================================"
echo "🚀 开始构建 ARM64 Docker 镜像（使用代理）"
echo "======================================"

# 清理旧的构建器（如果存在）
docker buildx rm arm-proxy-builder 2>/dev/null || true

# 创建构建器时设置代理
docker buildx create \
  --name arm-proxy-builder \
  --driver docker-container \
  --driver-opt network=host \
  --driver-opt env.http_proxy=${PROXY_URL} \
  --driver-opt env.https_proxy=${PROXY_URL} \
  --use

# 启动构建器
docker buildx inspect --bootstrap

echo "📁 当前目录: $(pwd)"
echo "📄 Dockerfile: ${DOCKERFILE}"

# 构建命令 - 添加上下文路径 `.`
docker buildx build \
  --platform linux/arm64 \
  -f ${DOCKERFILE} \
  --build-arg HTTP_PROXY=${PROXY_URL} \
  --build-arg HTTPS_PROXY=${PROXY_URL} \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  --load \
  .  # ⚠️ 这里必须加上上下文路径

echo "✅ 构建完成"
