#!/bin/bash
# DM8 SQL 执行脚本

# 设置变量
DM8_CONTAINER="dm8"
DM8_USER="SYSDBA"
DM8_PASS="Dm8DtUlR16LY8h0uC01zSYx"
SQL_FILE="$1"

if [ -z "$SQL_FILE" ]; then
    echo "用法: $0 <sql文件路径>"
    echo "示例: $0 deploy/dm8_init_final.sql"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 文件不存在: $SQL_FILE"
    exit 1
fi

echo "📋 复制 SQL 文件到容器..."
docker cp "$SQL_FILE" "$DM8_CONTAINER:/tmp/init.sql"

echo "🚀 执行 SQL..."
docker exec -i "$DM8_CONTAINER" bash -c "export LD_LIBRARY_PATH=/home/dmdba/dmdbms/bin && cat /tmp/init.sql | /home/dmdba/dmdbms/bin/disql $DM8_USER/$DM8_PASS"

echo ""
echo "✅ SQL 执行完成"
