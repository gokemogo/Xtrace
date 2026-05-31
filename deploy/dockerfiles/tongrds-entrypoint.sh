#!/bin/bash

# ==================================================
# TongRDS (Redis-compatible) Docker Entrypoint Script
# ==================================================

set -e

# 默认配置
TONGRDS_HOME=/opt/tongrds
TONGRDS_DATA=/data
TONGRDS_CONF=/etc/tongrds/tongrds.conf
TONGRDS_LOG=$TONGRDS_HOME/log/tongrds.log
PORT=${PORT:-6379}
PASSWORD=${REDIS_PASSWORD:-}
MAXMEMORY=${MAXMEMORY:-256mb}

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# 初始化配置
init_config() {
    log "Initializing TongRDS configuration..."

    # 创建必要的目录
    mkdir -p $TONGRDS_DATA
    mkdir -p $TONGRDS_HOME/log
    chown -R tongrds:tongrds $TONGRDS_DATA
    chown -R tongrds:tongrds $TONGRDS_HOME/log

    # 复制配置文件
    if [ ! -f "$TONGRDS_CONF" ]; then
        cp /etc/tongrds/tongrds.conf $TONGRDS_CONF
    fi

    # 更新配置文件
    sed -i "s|^port .*|port $PORT|" $TONGRDS_CONF
    sed -i "s|^maxmemory .*|maxmemory $MAXMEMORY|" $TONGRDS_CONF

    # 设置密码
    if [ -n "$PASSWORD" ]; then
        sed -i "s|^# requirepass .*|requirepass $PASSWORD|" $TONGRDS_CONF
        log "Password configured"
    fi

    # 设置日志文件
    sed -i "s|^logfile .*|logfile $TONGRDS_LOG|" $TONGRDS_CONF

    # 设置数据目录
    sed -i "s|^dir .*|dir $TONGRDS_DATA|" $TONGRDS_CONF

    log "Configuration initialized"
}

# 启动 TongRDS
start_tongrds() {
    log "Starting TongRDS server..."

    # 启动 Redis（TongRDS 兼容）
    redis-server $TONGRDS_CONF --daemonize no &

    # 等待启动
    log "Waiting for TongRDS to start..."
    for i in {1..30}; do
        if redis-cli -p $PORT ping > /dev/null 2>&1; then
            log "TongRDS started successfully"
            return 0
        fi
        sleep 1
    done

    log "ERROR: TongRDS failed to start"
    return 1
}

# 停止 TongRDS
stop_tongrds() {
    log "Stopping TongRDS server..."
    redis-cli -p $PORT shutdown
    log "TongRDS stopped"
}

# 信号处理
trap 'stop_tongrds; exit 0' SIGTERM SIGINT

# 主函数
main() {
    case "${1:-tongrds}" in
        tongrds)
            init_config
            start_tongrds

            log "=========================================="
            log "  TongRDS Server Started"
            log "  Port: $PORT"
            log "  Data Directory: $TONGRDS_DATA"
            log "  Max Memory: $MAXMEMORY"
            log "=========================================="

            # 保持前台运行
            wait
            ;;
        init)
            init_config
            ;;
        *)
            exec "$@"
            ;;
    esac
}

main "$@"
