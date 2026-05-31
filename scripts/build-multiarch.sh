#!/bin/bash

# ==================================================
# DeepTrace 多架构构建脚本
# 支持 ARM64 和 AMD64 (x86_64) 架构
# ==================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 镜像名称
IMAGE_NAME="deeptrace"
IMAGE_TAG="latest"

# 打印帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -n, --name NAME      镜像名称 (默认: deeptrace)"
    echo "  -t, --tag TAG        镜像标签 (默认: latest)"
    echo "  -p, --push           构建后推送到镜像仓库"
    echo "  -r, --registry REG   镜像仓库地址"
    echo "  -h, --help           显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 本地构建"
    echo "  $0 -t v1.0.0                          # 指定标签"
    echo "  $0 -p -r registry.example.com         # 构建并推送"
}

# 解析命令行参数
PUSH=false
REGISTRY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 构建完整的镜像名称
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
fi

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}DeepTrace 多架构构建${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "${YELLOW}镜像名称: ${FULL_IMAGE_NAME}${NC}"
echo -e "${YELLOW}目标架构: linux/amd64, linux/arm64${NC}"
echo ""

# 检查是否安装了 buildx
if ! docker buildx version > /dev/null 2>&1; then
    echo -e "${RED}错误: 未安装 docker buildx${NC}"
    echo "请安装 Docker Buildx: https://docs.docker.com/buildx/working-with-buildx/"
    exit 1
fi

# 创建 buildx builder（如果不存在）
BUILDER_NAME="deeptrace-builder"
if ! docker buildx inspect $BUILDER_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}创建 buildx builder: ${BUILDER_NAME}${NC}"
    docker buildx create --name $BUILDER_NAME --use
fi

# 构建多架构镜像
echo -e "${GREEN}开始构建多架构镜像...${NC}"
echo ""

if [ "$PUSH" = true ]; then
    # 构建并推送
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --file Dockerfile.universal \
        --tag $FULL_IMAGE_NAME \
        --push \
        .
else
    # 只构建（加载到本地 Docker）
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --file Dockerfile.universal \
        --tag $FULL_IMAGE_NAME \
        --load \
        .
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}构建完成！${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "${YELLOW}镜像: ${FULL_IMAGE_NAME}${NC}"
echo ""

if [ "$PUSH" = true ]; then
    echo -e "${GREEN}镜像已推送到: ${REGISTRY}${NC}"
else
    echo -e "${YELLOW}提示: 使用以下命令推送镜像:${NC}"
    echo -e "  docker push ${FULL_IMAGE_NAME}"
fi

echo ""
echo -e "${YELLOW}使用以下命令运行:${NC}"
echo -e "  docker-compose up -d"
