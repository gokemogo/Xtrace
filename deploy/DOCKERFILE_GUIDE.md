# Dockerfile 使用指南

## 概述

本指南介绍如何使用自定义 Dockerfile 构建 DM8 和 TongRDS 镜像。

## 📁 文件结构

```
deploy/dockerfiles/
├── Dockerfile.dm8          # DM8 数据库镜像
├── Dockerfile.tongrds      # TongRDS 镜像
├── entrypoint.sh           # DM8 启动脚本
├── tongrds-entrypoint.sh   # TongRDS 启动脚本
└── tongrds.conf            # TongRDS 配置文件
```

## 🚀 快速开始

### 方式一：使用自定义 Dockerfile 部署（推荐）

```bash
# 进入 deploy 目录
cd /data/deeptrace/deploy

# 复制环境变量模板
cp .env.example .env

# 编辑配置
vi .env

# 使用自定义 Dockerfile 部署
docker compose -f docker-compose-custom.yaml up -d
```

### 方式二：单独构建镜像

```bash
# 构建 DM8 镜像
cd /data/deeptrace/deploy/dockerfiles
docker build -f Dockerfile.dm8 -t deeptrace-dm8:custom .

# 构建 TongRDS 镜像
docker build -f Dockerfile.tongrds -t deeptrace-tongrds:custom .
```

## 📋 DM8 Dockerfile 详解

### Dockerfile.dm8

```dockerfile
# 基础镜像
FROM centos:7

# 安装系统依赖
RUN yum -y install gcc gcc-c++ make cmake gdb numactl glibc glibc-devel \
    libaio libaio-devel readline readline-devel zlib zlib-devel \
    openssl openssl-devel pam pam-devel libnsl

# 创建 DM8 用户
RUN groupadd dinstall && useradd -g dinstall -m -d /home/dmdba -s /bin/bash dmdba

# 创建安装目录
RUN mkdir -p /opt/dmdbms && chown -R dmdba:dinstall /opt/dmdbms

# 复制 DM8 安装包
COPY dm8_20250506_x86_rh6_rq_single.tar.gz /tmp/dm8.tar.gz

# 解压并安装
RUN cd /tmp && tar -xzf dm8.tar.gz
RUN cd /tmp/DMInstall && ./DMInstall.bin -i

# 复制初始化脚本
COPY dm8_init.sql /opt/dmdbms/init.sql
COPY entrypoint.sh /opt/dmdbms/entrypoint.sh

# 暴露端口
EXPOSE 5236

# 启动命令
ENTRYPOINT ["/opt/dmdbms/entrypoint.sh"]
CMD ["dmserver"]
```

### 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `SYSDBA_PWD` | SYSDBA 用户密码 | `Deeptrace2025` |
| `PORT` | DM8 端口 | `5236` |
| `INSTANCE_NAME` | 实例名称 | `DM8` |
| `PAGE_SIZE` | 页面大小 | `32` |
| `DB_NAME` | 数据库名称 | `DAMENG` |
| `RUN_SEED_SCRIPT` | 是否执行种子数据 | `false` |

### 使用示例

```bash
# 构建镜像
docker build -f Dockerfile.dm8 -t deeptrace-dm8:custom .

# 运行容器
docker run -d \
  --name dm8 \
  -p 5236:5236 \
  -e SYSDBA_PWD=MyPassword123 \
  -e PORT=5236 \
  -v dm8_data:/opt/dmdbms/data \
  deeptrace-dm8:custom
```

### 数据卷

| 路径 | 说明 |
|------|------|
| `/opt/dmdbms/data` | 数据目录 |
| `/opt/dmdbms/log` | 日志目录 |
| `/opt/dmdbms/init.sql` | 初始化脚本 |
| `/opt/dmdbms/seed_data.sql` | 种子数据脚本 |

### 健康检查

```bash
# 检查 DM8 是否正常
docker exec dm8 /opt/dmdbms/bin/disql SYSDBA/Password@localhost:5236 -E "SELECT 1 FROM dual"
```

## 📋 TongRDS Dockerfile 详解

### Dockerfile.tongrds

```dockerfile
# 基础镜像
FROM alpine:3.18

# 安装系统依赖
RUN apk add --no-cache bash curl tini su-exec redis

# 创建 tongrds 用户
RUN addgroup -S tongrds && adduser -S -G tongrds -h /opt/tongrds tongrds

# 创建目录结构
RUN mkdir -p /opt/tongrds /data /etc/tongrds

# 复制配置文件
COPY tongrds.conf /etc/tongrds/tongrds.conf
COPY tongrds-entrypoint.sh /usr/local/bin/tongrds-entrypoint.sh

# 暴露端口
EXPOSE 6379

# 启动命令
ENTRYPOINT ["tini", "--"]
CMD ["tongrds-entrypoint.sh"]
```

### 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | TongRDS 端口 | `6379` |
| `REDIS_PASSWORD` | 认证密码 | （无密码） |
| `MAXMEMORY` | 最大内存限制 | `256mb` |

### 使用示例

```bash
# 构建镜像
docker build -f Dockerfile.tongrds -t deeptrace-tongrds:custom .

# 运行容器
docker run -d \
  --name tongrds \
  -p 6379:6379 \
  -e REDIS_PASSWORD=MyRedisPassword \
  -e MAXMEMORY=512mb \
  -v tongrds_data:/data \
  deeptrace-tongrds:custom
```

### 数据卷

| 路径 | 说明 |
|------|------|
| `/data` | 数据目录 |
| `/opt/tongrds/log` | 日志目录 |
| `/etc/tongrds/tongrds.conf` | 配置文件 |

### 配置文件说明

`tongrds.conf` 主要配置项：

```conf
# 网络配置
bind 0.0.0.0
port 6379

# 持久化配置
save 900 1
save 300 10
save 60 10000
appendonly yes

# 内存配置
maxmemory 256mb
maxmemory-policy allkeys-lru

# 安全配置
# requirepass your-password-here

# 日志配置
loglevel notice
logfile /opt/tongrds/log/tongrds.log
```

### 健康检查

```bash
# 检查 TongRDS 是否正常
docker exec tongrds redis-cli ping

# 检查 TongRDS 状态
docker exec tongrds redis-cli info
```

## 🐳 使用 Docker Compose 部署

### docker-compose-custom.yaml

```yaml
services:
  dm8:
    build:
      context: ./dockerfiles
      dockerfile: Dockerfile.dm8
    environment:
      - SYSDBA_PWD=${DM8_PASSWORD:-Deeptrace2025}
      - PORT=5236
    ports:
      - "5236:5236"
    volumes:
      - dm8_data:/opt/dmdbms/data
      - ./dm8_init.sql:/opt/dmdbms/init.sql

  tongrds:
    build:
      context: ./dockerfiles
      dockerfile: Dockerfile.tongrds
    environment:
      - PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
    ports:
      - "6379:6379"
    volumes:
      - tongrds_data:/data

  deeptrace-web:
    build:
      context: ..
      dockerfile: Dockerfile.dm8
    ports:
      - "3000:5000"
    environment:
      - DB_TYPE=dm8
      - DATABASE_URL=dm://SYSDBA:${DM8_PASSWORD}@dm8:5236
      - REDIS_HOST=tongrds
      - REDIS_PORT=6379
    depends_on:
      - dm8
      - tongrds

  deeptrace-worker:
    build:
      context: ..
      dockerfile: Dockerfile.dm8
    command: ["node", "worker/dist/index.js"]
    ports:
      - "5001:5001"
    environment:
      - DB_TYPE=dm8
      - DATABASE_URL=dm://SYSDBA:${DM8_PASSWORD}@dm8:5236
      - REDIS_HOST=tongrds
      - REDIS_PORT=6379
    depends_on:
      - deeptrace-web
```

### 启动命令

```bash
# 使用自定义 Dockerfile 部署
docker compose -f docker-compose-custom.yaml up -d

# 查看日志
docker compose -f docker-compose-custom.yaml logs -f

# 停止服务
docker compose -f docker-compose-custom.yaml down
```

## 🔧 自定义配置

### 修改 DM8 配置

编辑 `docker-compose-custom.yaml`：

```yaml
dm8:
  environment:
    - SYSDBA_PWD=MyStrongPassword123!
    - PORT=5237
    - INSTANCE_NAME=MY_DM8
    - PAGE_SIZE=32
```

### 修改 TongRDS 配置

编辑 `docker-compose-custom.yaml`：

```yaml
tongrds:
  environment:
    - REDIS_PASSWORD=MyRedisPassword123!
    - MAXMEMORY=512mb
  ports:
    - "6380:6379"
```

### 自定义 TongRDS 配置文件

1. 复制配置文件：
```bash
cp deploy/dockerfiles/tongrds.conf deploy/tongrds-custom.conf
```

2. 编辑配置：
```bash
vi deploy/tongrds-custom.conf
```

3. 在 docker-compose 中挂载：
```yaml
tongrds:
  volumes:
    - ./tongrds-custom.conf:/etc/tongrds/tongrds.conf
```

## 📊 镜像大小对比

| 镜像 | 大小 | 说明 |
|------|------|------|
| `deeptrace-dm8:custom` | ~2GB | 包含 DM8 数据库 |
| `deeptrace-tongrds:custom` | ~30MB | 基于 Alpine |
| `redis:7-alpine` | ~30MB | 官方 Redis 镜像 |
| `deeptrace:dm8` | ~500MB | DeepTrace 应用 |

## 🔍 故障排查

### DM8 启动失败

```bash
# 查看日志
docker logs deeptrace-dm8

# 检查数据目录
docker exec -it deeptrace-dm8 ls -la /opt/dmdbms/data

# 手动启动 DM8
docker exec -it deeptrace-dm8 /opt/dmdbms/bin/dmserver /opt/dmdbms/data/DAMENG/dm.ini
```

### TongRDS 启动失败

```bash
# 查看日志
docker logs deeptrace-tongrds

# 检查配置
docker exec -it deeptrace-tongrds cat /etc/tongrds/tongrds.conf

# 手动启动 TongRDS
docker exec -it deeptrace-tongrds redis-server /etc/tongrds/tongrds.conf
```

### 连接问题

```bash
# 测试 DM8 连接
docker exec -it deeptrace-dm8 /opt/dmdbms/bin/disql SYSDBA/Password@localhost:5236

# 测试 TongRDS 连接
docker exec -it deeptrace-tongrds redis-cli -a Password ping

# 检查网络
docker network inspect deeptrace-network
```

## 🔒 安全建议

### 1. 修改默认密码

```bash
# DM8 密码
export DM8_PASSWORD=YourStrongPassword123!

# TongRDS 密码
export REDIS_PASSWORD=YourRedisPassword123!
```

### 2. 限制网络访问

```yaml
# 只允许本地访问
ports:
  - "127.0.0.1:5236:5236"
  - "127.0.0.1:6379:6379"
```

### 3. 使用 Docker Secrets

```yaml
services:
  dm8:
    secrets:
      - dm8_password
    environment:
      - SYSDBA_PWD_FILE=/run/secrets/dm8_password

secrets:
  dm8_password:
    file: ./secrets/dm8_password.txt
```

## 📈 性能优化

### DM8 性能优化

```yaml
dm8:
  environment:
    - PAGE_SIZE=32
    - BUFFER=1024
    - MAX_BUFFER=2048
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 8G
```

### TongRDS 性能优化

```yaml
tongrds:
  environment:
    - MAXMEMORY=2gb
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

## 📚 参考资料

- [DM8 官方文档](https://www.dameng.com/)
- [Redis 官方文档](https://redis.io/docs/)
- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

## ✅ 检查清单

### 构建前检查

- [ ] Docker 已安装
- [ ] DM8 安装包已准备
- [ ] 网络连通性正常
- [ ] 磁盘空间充足

### 部署前检查

- [ ] 环境变量已配置
- [ ] 密码已修改
- [ ] 端口未被占用
- [ ] 数据卷已创建

### 运行后检查

- [ ] 容器状态正常
- [ ] 健康检查通过
- [ ] 连接测试成功
- [ ] 日志无错误
