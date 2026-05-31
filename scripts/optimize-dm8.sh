#!/bin/bash

# ==================================================
# DM8 性能优化脚本
# ==================================================

set -e

echo "=========================================="
echo "  DM8 性能优化脚本"
echo "=========================================="
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "使用方法: $0 <DM8_CONTAINER_NAME>"
    echo ""
    echo "示例: $0 deeptrace-db-dm8"
    exit 1
fi

CONTAINER_NAME=$1
DM8_USER=${2:-SYSDBA}
DM8_PASSWORD=${3:-Deeptrace2025}

echo "配置信息："
echo "  容器名称：$CONTAINER_NAME"
echo "  用户名：$DM8_USER"
echo "  密码：***"
echo ""

# 检查容器是否存在
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ 错误：容器 $CONTAINER_NAME 不存在或未运行"
    exit 1
fi

# 检查容器是否健康
echo "1. 检查 DM8 容器状态..."
if docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "healthy"; then
    echo "   ✅ 容器状态正常"
else
    echo "   ⚠️  容器可能未就绪，继续执行..."
fi

# 执行优化脚本
echo ""
echo "2. 执行性能优化脚本..."
echo "   这可能需要几分钟时间..."
echo ""

# 复制优化脚本到容器
docker cp deploy/dm8_optimization.sql "$CONTAINER_NAME":/opt/dmdbms/optimization.sql

# 执行优化脚本
docker exec -i "$CONTAINER_NAME" /opt/dmdbms/bin/disql "$DM8_USER/$DM8_PASSWORD@localhost:5236" -E "
    SET ECHO OFF;
    SET FEEDBACK ON;
    SET TIMING ON;
    @/opt/dmdbms/optimization.sql;
    COMMIT;
"

echo ""
echo "=========================================="
echo "  优化完成！"
echo "=========================================="
echo ""
echo "已完成的优化："
echo "  ✅ 项目切换优化索引"
echo "  ✅ Dashboard 查询优化索引"
echo "  ✅ API 密钥操作优化索引"
echo "  ✅ 会话查询优化索引"
echo "  ✅ 数据集查询优化索引"
echo "  ✅ 评估任务优化索引"
echo "  ✅ 批量导出优化索引"
echo "  ✅ 任务队列优化索引"
echo "  ✅ 提示词查询优化索引"
echo "  ✅ 模型查询优化索引"
echo ""
echo "预期效果："
echo "  - 项目切换：~2s → ~200ms"
echo "  - Dashboard 加载：~10s → ~1s"
echo "  - API 密钥操作：正常执行"
echo "  - 会话列表：~3s → ~300ms"
echo "  - 数据集查询：~2s → ~200ms"
echo ""
echo "建议："
echo "  1. 重启 DeepTrace 应用以应用优化"
echo "  2. 定期更新统计信息（每周一次）"
echo "  3. 监控查询性能"
echo ""
