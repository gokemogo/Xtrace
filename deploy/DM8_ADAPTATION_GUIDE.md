# DeepTrace DM8 适配指南

## 概述

本文档说明 DeepTrace 从 PostgreSQL 适配到 DM8 (达梦数据库) 的改动和部署方法。

## 架构变更

### 数据库层
- **PostgreSQL**: 使用 Prisma ORM (原有架构)
- **DM8**: 使用 dmdb 原生驱动 + 自定义适配层

### 缓存层
- **Redis**: 原有 Redis 容器
- **TongRDS**: 使用宿主机运行的 TongRDS (Redis-compatible)

## 已完成的适配

### 1. 核心适配层 (`packages/shared/src/`)

| 文件 | 说明 |
|------|------|
| `db.ts` | DM8 代理，拦截 `$queryRaw`/`$executeRaw`，实现完整 ORM model 代理 |
| `db-adapter/dm8-adapter.ts` | DM8 适配器实现 |
| `db-adapter/factory.ts` | 数据库适配器工厂 |
| `db-adapter/sql-dialect.ts` | SQL 方言兼容函数 |
| `filterToPrisma.ts` | 过滤器 DM8 兼容 |

### 2. Web 应用适配

| 文件 | 说明 |
|------|------|
| `web/src/server/api/trpc.ts` | tRPC 上下文注入 adapter |
| `web/src/server/api/routers/*.ts` | 路由文件 DM8 SQL 兼容 |
| `web/src/pages/api/public/*.ts` | 公共 API DM8 兼容 |

### 3. Worker 适配

| 文件 | 说明 |
|------|------|
| `worker/src/queues/evalQueue.ts` | Eval 队列支持 DM8 |
| `worker/src/queues/batchExportQueue.ts` | Batch Export 队列支持 DM8 |
| `worker/src/features/batchExport/enqueueBatchExportJobs.ts` | Batch Export 入队支持 DM8 |

### 4. 配置文件

| 文件 | 说明 |
|------|------|
| `.env` | TongRDS 配置 (localhost:6379) |
| `.env.dm8` | DM8 + TongRDS 配置模板 |
| `deploy/docker-deeptrace-dm8-compose.yaml` | DM8 Docker Compose |
| `Dockerfile.dm8` | DM8 专用 Dockerfile |
| `deploy/dm8_init.sql` | DM8 数据库初始化脚本 |

## 部署步骤

### 1. 准备环境

```bash
# 确保 DM8 和 TongRDS 已启动
# DM8: localhost:5236
# TongRDS: localhost:6379
```

### 2. 初始化数据库

```bash
# 使用 disql 执行初始化脚本
/opt/dmdbms/bin/disql SYSDBA/Deeptrace2025@localhost:5236 -f /path/to/dm8_init.sql
```

### 3. Docker 部署

```bash
cd /data/deeptrace/deploy

# 构建镜像
docker compose -f docker-deeptrace-dm8-compose.yaml build

# 启动服务
docker compose -f docker-deeptrace-dm8-compose.yaml up -d

# 查看日志
docker compose -f docker-deeptrace-dm8-compose.yaml logs -f
```

### 4. 本地开发

```bash
# 复制 DM8 配置
cp .env.dm8 .env

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

## 已知限制

### 1. ORM 方法部分支持

DM8 代理支持以下 Prisma Model 方法：
- `findMany` / `findFirst` / `findUnique`
- `create` / `createMany`
- `update` / `updateMany`
- `upsert`
- `delete` / `deleteMany`
- `count`

不支持：
- `groupBy` - 需要手动实现
- `aggregate` - 需要手动实现
- 复杂嵌套查询 - 需要优化

### 2. NextAuth 适配

NextAuth 使用 Prisma Adapter，需要在 DM8 模式下测试：
- 用户注册
- 用户登录
- Session 管理

### 3. Kysely 查询

4 个文件仍使用 Kysely (PostgreSQL-specific)：
- `worker/src/__tests__/eval-service.test.ts` - 测试文件
- `worker/src/features/batchExport/enqueueBatchExportJobs.ts` - 已适配
- `worker/src/queues/batchExportQueue.ts` - 已适配
- `worker/src/queues/evalQueue.ts` - 已适配

## 待优化

### 1. 性能优化
- [ ] DM8 连接池配置优化
- [ ] 批量插入优化 (INSERT ALL)
- [ ] 索引优化

### 2. 功能完善
- [ ] 完整的 NextAuth DM8 适配
- [ ] 所有 ORM 方法完整实现
- [ ] 复杂查询的 DM8 SQL 重写

### 3. 监控告警
- [ ] DM8 连接监控
- [ ] 查询性能监控
- [ ] 错误告警

## 故障排查

### 1. 连接失败

```bash
# 检查 DM8 是否运行
docker ps | grep dm8

# 测试 DM8 连接
/opt/dmdbms/bin/disql SYSDBA/Deeptrace2025@localhost:5236 -c "SELECT 1"
```

### 2. 表不存在

```bash
# 检查表是否创建
/opt/dmdbms/bin/disql SYSDBA/Deeptrace2025@localhost:5236 -c "SELECT table_name FROM user_tables"
```

### 3. TongRDS 连接失败

```bash
# 测试 TongRDS 连接
redis-cli -h localhost -p 6379 ping
```

## 联系方式

如有问题，请联系 DeepTrace 团队。
