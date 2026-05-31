# Docker Compose 部署指南（连接外部数据库）

## 概述

本指南介绍如何使用 Docker Compose 部署 Langfuse，连接外部 DM8 和 TongRDS 数据库。

## 前置条件

- Docker 和 Docker Compose 已安装
- DM8 数据库已部署并可访问
- TongRDS 已部署并可访问
- 已获取数据库连接信息（IP、端口、用户名、密码）

## 快速部署

### 步骤 1: 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑配置文件，替换数据库连接信息
vi .env
```

需要修改的关键配置：
```bash
# DM8 数据库连接（替换为实际信息）
DATABASE_URL=dm://SYSDBA:YourPassword@192.168.1.100:5236

# TongRDS 连接（替换为实际信息）
REDIS_HOST=192.168.1.101
REDIS_PORT=6379
REDIS_AUTH=YourRedisPassword
```

### 步骤 2: 构建 Docker 镜像

```bash
# 构建镜像
docker compose build

# 或者使用 no-cache 重新构建
docker compose build --no-cache
```

### 步骤 3: 初始化数据库

如果 DM8 数据库还没有初始化：

```bash
# 使用 DM8 客户端执行初始化脚本
docker exec -i dm8_container_name /opt/dmdbms/bin/disql SYSDBA/YourPassword < deploy/dm8_init.sql

# 或者使用本地客户端
./disql SYSDBA/YourPassword@192.168.1.100:5236 < deploy/dm8_init.sql
```

### 步骤 4: 启动服务

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 步骤 5: 验证部署

```bash
# 检查 Web 服务健康状态
curl http://localhost:3000/api/public/health

# 检查 Worker 服务健康状态
curl http://localhost:3030/api/health

# 预期返回
{
  "status": "ok",
  "version": "2.65.1"
}
```

### 步骤 6: 登录系统

1. 打开浏览器：http://localhost:3000
2. 使用默认账号登录：
   - 邮箱：`administrator@orbitai.com`
   - 密码：`administrator`

## 配置详解

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | DM8 连接字符串 | `dm://SYSDBA:pass@192.168.1.100:5236` |
| `REDIS_HOST` | TongRDS IP 地址 | `192.168.1.101` |
| `REDIS_PORT` | TongRDS 端口 | `6379` |
| `REDIS_AUTH` | TongRDS 密码 | `password` 或留空 |
| `WEB_PORT` | Web 服务端口 | `3000` |
| `WORKER_PORT` | Worker 服务端口 | `3030` |
| `NEXTAUTH_URL` | NextAuth 回调地址 | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | 随机字符串 |
| `SALT` | 密码盐值 | 随机字符串 |
| `LANGFUSE_WORKER_PASSWORD` | Worker 认证密码 | `mybasicauthsecret` |

### Docker Compose 配置说明

```yaml
services:
  langfuse-web:
    # Web 应用服务
    ports:
      - "${WEB_PORT:-3000}:5000"  # 映射端口
    extra_hosts:
      - "host.docker.internal:host-gateway"  # 允许访问宿主机网络
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:5000/api/public/health"]
      interval: 30s  # 每 30 秒检查一次
      start_period: 60s  # 启动后等待 60 秒开始检查

  langfuse-worker:
    # Worker 服务
    command: ["node", "worker/dist/index.js"]  # 启动命令
    depends_on:
      langfuse-web:
        condition: service_healthy  # 等待 Web 服务健康后启动
```

## 常用命令

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f langfuse-web
docker compose logs -f langfuse-worker
```

### 镜像管理

```bash
# 构建镜像
docker compose build

# 重新构建（无缓存）
docker compose build --no-cache

# 拉取最新镜像
docker compose pull

# 推送镜像到仓库
docker compose push
```

### 数据库管理

```bash
# 进入 DM8 容器（如果 DM8 也在 Docker 中）
docker exec -it dm8_container /bin/bash

# 执行 SQL 脚本
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/Password < script.sql

# 备份数据库
docker exec dm8_container /opt/dmdbms/bin/dexp SYSDBA/Password file=/backup.dmp
```

## 故障排查

### 问题 1: 服务启动失败

**症状**: 容器退出或重启

**排查步骤**:
```bash
# 查看容器日志
docker compose logs langfuse-web
docker compose logs langfuse-worker

# 检查容器状态
docker compose ps

# 进入容器调试
docker exec -it langfuse-web /bin/sh
```

**常见原因**:
1. 数据库连接失败
2. 端口冲突
3. 配置错误

### 问题 2: 数据库连接失败

**症状**: 日志显示连接错误

**排查步骤**:
```bash
# 测试网络连通性
docker exec langfuse-web ping 192.168.1.100
docker exec langfuse-web telnet 192.168.1.100 5236

# 检查 DNS 解析
docker exec langfuse-web nslookup 192.168.1.100

# 测试数据库连接
docker exec langfuse-web node -e "
const dmdb = require('dmdb');
dmdb.createPool({ connectionString: process.env.DATABASE_URL })
  .then(pool => pool.getConnection())
  .then(conn => { console.log('连接成功'); conn.close(); })
  .catch(e => console.error('连接失败:', e.message));
"
```

**解决方案**:
1. 检查数据库 IP 和端口是否正确
2. 检查防火墙设置
3. 确认数据库服务是否正常
4. 检查用户名和密码是否正确

### 问题 3: 健康检查失败

**症状**: 容器显示 unhealthy 状态

**排查步骤**:
```bash
# 手动测试健康检查接口
docker exec langfuse-web wget -qO- http://localhost:5000/api/public/health

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' langfuse-web
```

**解决方案**:
1. 增加 `start_period` 时间
2. 检查应用是否正常启动
3. 检查端口是否正确

### 问题 4: 端口冲突

**症状**: 启动失败，提示端口已被占用

**排查步骤**:
```bash
# 检查端口占用
netstat -tulpn | grep :3000
lsof -i :3000

# 修改端口映射
vi docker-compose.yaml
# 修改 ports 配置
```

**解决方案**:
1. 修改 `.env` 中的端口配置
2. 或停止占用端口的服务

## 性能优化

### 1. 资源限制

```yaml
services:
  langfuse-web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### 2. 日志管理

```yaml
services:
  langfuse-web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"  # 单个日志文件最大 10MB
        max-file: "3"    # 最多保留 3 个日志文件
```

### 3. 重启策略

```yaml
services:
  langfuse-web:
    restart: unless-stopped  # 除非手动停止，否则总是重启
```

## 安全建议

1. **修改默认密码**: 生产环境必须修改所有默认密码
2. **使用强密码**: 密码长度至少 12 位，包含大小写字母、数字和特殊字符
3. **限制网络访问**: 使用防火墙限制数据库访问 IP
4. **启用 HTTPS**: 生产环境使用反向代理启用 HTTPS
5. **定期备份**: 定期备份数据库和配置文件
6. **更新镜像**: 定期更新 Docker 镜像以获取安全补丁

## 生产环境配置

### 1. 使用 Docker Secrets

```yaml
services:
  langfuse-web:
    secrets:
      - db_password
      - redis_password
    environment:
      - DATABASE_URL=dm://SYSDBA:/run/secrets/db_password@192.168.1.100:5236

secrets:
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
```

### 2. 使用 Docker Stack

```bash
# 部署到 Docker Swarm
docker stack deploy -c docker-compose.yaml langfuse

# 查看服务状态
docker stack services langfuse
```

### 3. 使用外部配置管理

```bash
# 使用环境变量文件
docker compose --env-file /path/to/.env up -d

# 使用 Docker Config
docker config create langfuse_config ./config.yaml
```

## 监控和维护

### 1. 监控服务状态

```bash
# 查看容器资源使用
docker stats

# 查看容器详情
docker inspect langfuse-web

# 查看服务日志
docker compose logs -f --tail=100
```

### 2. 数据库维护

```sql
-- 清理过期任务
DELETE FROM "job_queue"
WHERE "status" = 'completed'
AND "completed_at" < SYSDATE - 30;

-- 重建索引
ALTER INDEX "job_queue_status_queue_name_idx" REBUILD;
```

### 3. 备份和恢复

```bash
# 备份配置文件
cp .env .env.backup
cp docker-compose.yaml docker-compose.yaml.backup

# 恢复配置文件
cp .env.backup .env
cp docker-compose.yaml.backup docker-compose.yaml
```

## 升级指南

### 1. 升级镜像

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker compose build --no-cache

# 停止旧服务
docker compose down

# 启动新服务
docker compose up -d
```

### 2. 数据库迁移

```bash
# 执行数据库迁移脚本
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/Password < deploy/migration.sql
```

## 常见问题 FAQ

### Q1: 如何修改 Web 服务端口？

修改 `.env` 文件：
```bash
WEB_PORT=8080
```

然后重启服务：
```bash
docker compose down
docker compose up -d
```

### Q2: 如何查看实时日志？

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f langfuse-web
docker compose logs -f langfuse-worker
```

### Q3: 如何进入容器调试？

```bash
# 进入 Web 容器
docker exec -it langfuse-web /bin/sh

# 进入 Worker 容器
docker exec -it langfuse-worker /bin/sh
```

### Q4: 如何重启单个服务？

```bash
# 重启 Web 服务
docker compose restart langfuse-web

# 重启 Worker 服务
docker compose restart langfuse-worker
```

### Q5: 如何清理 Docker 资源？

```bash
# 清理停止的容器
docker container prune

# 清理未使用的镜像
docker image prune

# 清理未使用的卷
docker volume prune

# 清理所有未使用的资源
docker system prune -a
```

## 技术支持

遇到问题时，请提供以下信息：

1. Docker 版本：`docker --version`
2. Docker Compose 版本：`docker compose version`
3. 操作系统版本
4. 错误日志：`docker compose logs`
5. 容器状态：`docker compose ps`
6. 网络配置：`docker network ls`

## 总结

使用 Docker Compose 部署 Langfuse 连接外部数据库的优势：

✅ **简化部署**: 一条命令启动所有服务
✅ **易于管理**: 统一的配置和管理方式
✅ **快速扩展**: 轻松扩展服务实例
✅ **环境一致**: 开发、测试、生产环境一致
✅ **易于维护**: 简化升级和维护工作

按照本指南操作，你可以快速部署 Langfuse 并连接到外部 DM8 和 TongRDS 数据库。
