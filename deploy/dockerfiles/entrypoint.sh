#!/bin/bash

# ==================================================
# DM8 Docker Entrypoint Script
# ==================================================

set -e

# 默认配置
DM_HOME=/opt/dmdbms
DATA_DIR=$DM_HOME/data
LOG_DIR=$DM_HOME/log
PORT=${PORT:-5236}
SYSDBA_PWD=${SYSDBA_PWD:-Deeptrace2025}
INSTANCE_NAME=${INSTANCE_NAME:-DM8}
PAGE_SIZE=${PAGE_SIZE:-32}
EXTENT_SIZE=${EXTENT_SIZE:-16}
CASE_SENSITIVE=${CASE_SENSITIVE:-1}
CHARSET=${CHARSET:-0}
DB_NAME=${DB_NAME:-DAMENG}

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# 初始化数据库
init_database() {
    if [ ! -d "$DATA_DIR/$DB_NAME" ]; then
        log "Initializing DM8 database..."

        # 创建必要的目录
        mkdir -p $DATA_DIR
        mkdir -p $LOG_DIR
        chown -R dmdba:dinstall $DATA_DIR
        chown -R dmdba:dinstall $LOG_DIR

        # 使用 dminit 初始化数据库
        su - dmdba -c "$DM_HOME/bin/dminit \
            PATH=$DATA_DIR \
            PAGE_SIZE=$PAGE_SIZE \
            EXTENT_SIZE=$EXTENT_SIZE \
            CASE_SENSITIVE=$CASE_SENSITIVE \
            CHARSET=$CHARSET \
            DB_NAME=$DB_NAME \
            INSTANCE_NAME=$INSTANCE_NAME \
            SYSDBA_PWD=$SYSDBA_PWD \
            PORT_NUM=$PORT"

        log "Database initialized successfully"
    else
        log "Database already exists, skipping initialization"
    fi
}

# 启动数据库
start_database() {
    log "Starting DM8 database..."

    # 启动 dmserver
    su - dmdba -c "$DM_HOME/bin/dmserver \
        $DATA_DIR/$DB_NAME/dm.ini \
        -noconsole" &

    # 等待数据库启动
    log "Waiting for database to start..."
    for i in {1..60}; do
        if $DM_HOME/bin/disql SYSDBA/$SYSDBA_PWD@localhost:$PORT -E "SELECT 1 FROM dual" > /dev/null 2>&1; then
            log "Database started successfully"
            return 0
        fi
        sleep 2
    done

    log "ERROR: Database failed to start"
    return 1
}

# 执行初始化脚本
run_init_scripts() {
    log "Running initialization scripts..."

    # 执行 dm8_init.sql
    if [ -f "$DM_HOME/init.sql" ]; then
        log "Executing dm8_init.sql..."
        $DM_HOME/bin/disql SYSDBA/$SYSDBA_PWD@localhost:$PORT -E "
            SET ECHO OFF;
            SET FEEDBACK OFF;
            SET HEADING OFF;
            @$DM_HOME/init.sql;
            COMMIT;
        "
        log "dm8_init.sql executed successfully"
    fi

    # 执行 dm8_seed_data.sql（可选）
    if [ -f "$DM_HOME/seed_data.sql" ] && [ "${RUN_SEED_SCRIPT:-false}" = "true" ]; then
        log "Executing dm8_seed_data.sql..."
        $DM_HOME/bin/disql SYSDBA/$SYSDBA_PWD@localhost:$PORT -E "
            SET ECHO OFF;
            SET FEEDBACK OFF;
            SET HEADING OFF;
            @$DM_HOME/seed_data.sql;
            COMMIT;
        "
        log "dm8_seed_data.sql executed successfully"
    fi
}

# 停止数据库
stop_database() {
    log "Stopping DM8 database..."
    $DM_HOME/bin/disql SYSDBA/$SYSDBA_PWD@localhost:$PORT -E "SHUTDOWN;"
    log "Database stopped"
}

# 信号处理
trap 'stop_database; exit 0' SIGTERM SIGINT

# 主函数
main() {
    case "${1:-dmserver}" in
        dmserver)
            init_database
            start_database
            run_init_scripts

            log "=========================================="
            log "  DM8 Database Server Started"
            log "  Port: $PORT"
            log "  Instance: $INSTANCE_NAME"
            log "  Data Directory: $DATA_DIR/$DB_NAME"
            log "=========================================="

            # 保持前台运行
            wait
            ;;
        init)
            init_database
            ;;
        *)
            exec "$@"
            ;;
    esac
}

main "$@"
