# DM8 + TongRDS 完整适配方案实现文档

## 概述

本文档描述了如何将 Langfuse 从 PostgreSQL + Redis 完整迁移到 DM8 + TongRDS 方案，实现所有功能的完整支持。

## 已实现功能

### 1. 数据库队列系统（替代 BullMQ）

**问题**：BullMQ 依赖 Redis Lua 脚本的 `bit` 库，TongRDS 不支持。

**解决方案**：实现基于 DM8 数据表的任务队列。

**新增文件**：
- `packages/shared/src/queue/queue-interface.ts` - 队列接口定义
- `packages/shared/src/queue/db-queue.ts` - 数据库队列核心实现
- `packages/shared/src/queue/index.ts` - 队列模块导出
- `worker/src/queues/dm8/evalQueue.ts` - DM8 版评估队列
- `worker/src/queues/dm8/batchExportQueue.ts` - DM8 版批量导出队列
- `worker/src/queues/dm8/repeatQueue.ts` - DM8 版定时任务队列
- `worker/src/queue-factory.ts` - 队列工厂（根据 DB_TYPE 选择队列实现）

**数据库表**：
```sql
CREATE TABLE "job_queue" (
    "id" VARCHAR(100) NOT NULL,
    "queue_name" VARCHAR(100) NOT NULL,
    "job_name" VARCHAR(200) NOT NULL,
    "payload" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "priority" INT DEFAULT 0,
    "attempts" INT DEFAULT 0,
    "max_attempts" INT DEFAULT 5,
    "delay_until" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "failed_at" TIMESTAMP,
    "error" TEXT,
    "result" TEXT,
    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);
```

**核心功能**：
- `add()` - 添加任务
- `addBulk()` - 批量添加任务
- `process()` - 获取待处理任务（原子操作，使用 SELECT FOR UPDATE）
- `complete()` - 标记任务完成
- `fail()` - 标记任务失败（支持指数退避重试）
- `retry()` - 重试失败任务
- `getStats()` - 获取队列统计信息
- `clean()` - 清理已完成任务

### 2. ORM 嵌套查询支持

**问题**：DM8 代理不支持 Prisma 的 `include` 嵌套关联查询。

**解决方案**：扩展 DM8 代理支持 `include` 和 `select`。

**修改文件**：
- `packages/shared/src/db.ts` - 添加关系配置和 include/select 支持

**关系配置**：
```typescript
const DM8_RELATIONS: Record<string, Record<string, RelationConfig>> = {
  trace: {
    observations: { table: "observations", fromField: "id", toField: "trace_id", type: "one-to-many" },
    scores: { table: "scores", fromField: "id", toField: "trace_id", type: "one-to-many" },
    session: { table: "trace_sessions", fromField: "session_id", toField: "id", type: "many-to-one" },
  },
  project: {
    projectMemberships: {
      table: "project_memberships",
      fromField: "id",
      toField: "project_id",
      type: "one-to-many",
      nested: {
        user: { table: "users", fromField: "user_id", toField: "id", type: "many-to-one" },
      },
    },
  },
  // ... 更多关系配置
};
```

**使用示例**：
```typescript
// 查询 trace 包含 observations 和 scores
const traces = await prisma.trace.findMany({
  where: { projectId: 'xxx' },
  include: {
    observations: true,
    scores: true,
  },
});

// 查询项目包含成员和用户信息
const projects = await prisma.project.findMany({
  include: {
    projectMemberships: {
      include: {
        user: true,
      },
    },
  },
});
```

### 3. Worker 服务适配

**修改文件**：
- `worker/src/app.ts` - 使用队列工厂初始化队列系统
- `worker/src/api/index.ts` - 使用队列工厂处理事件
- `worker/src/features/batchExport/enqueueBatchExportJobs.ts` - 使用队列工厂
- `worker/src/features/health/index.ts` - 健康检查适配 DM8 模式

**队列工厂**：
```typescript
// 根据 DB_TYPE 选择队列实现
export async function initializeQueues(): Promise<QueueInstances> {
  const dbType = getDbType();

  if (dbType === "dm8") {
    // DM8 模式：使用数据库队列
    const evalQueue = await getEvalQueue();
    const batchExportQueue = await getBatchExportQueue();
    const repeatQueue = await getRepeatQueue();
    // ...
  } else {
    // PostgreSQL 模式：使用 BullMQ 队列
    // ...
  }
}
```

## 配置说明

### 环境变量

```bash
# 数据库类型：postgresql 或 dm8
DB_TYPE=dm8

# DM8 数据库连接
DATABASE_URL=dm://SYSDBA:Deeptrace2025@localhost:5236

# Redis/TongRDS 连接（可选，用于缓存）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_AUTH=
```

### 切换脚本

```bash
# 切换到 DM8 模式
./scripts/switch-to-dm8.sh

# 切换到 PostgreSQL 模式
./scripts/switch-to-pgsql.sh
```

## 部署步骤

### 1. 初始化 DM8 数据库

```bash
# 执行初始化脚本
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/Deeptrace2025 < deploy/dm8_init.sql
```

### 2. 启动服务

```bash
# 使用 Docker Compose 启动
docker compose -f deploy/docker-deeptrace-dm8-compose.yaml up -d
```

### 3. 验证服务

```bash
# 检查健康状态
curl http://localhost:3030/api/health

# 预期返回
{
  "status": "ok",
  "database": "dm8",
  "queue": "database"
}
```

## 功能对比

| 功能 | PostgreSQL + Redis | DM8 + TongRDS |
|------|-------------------|---------------|
| 任务队列 | BullMQ (Redis Lua) | 数据库队列 (DM8) |
| ORM 查询 | Prisma (完整支持) | DM8 代理 (支持 include/select) |
| 嵌套查询 | LEFT JOIN LATERAL | 子查询 + 多次查询 |
| 健康检查 | 数据库 + Redis | 数据库 + 队列表 |
| 并发处理 | Redis 原子操作 | SELECT FOR UPDATE |
| 重试机制 | BullMQ 内置 | 指数退避重试 |

## 性能优化建议

### 1. 数据库队列优化

- 为 `job_queue` 表添加合适的索引
- 定期清理已完成的任务
- 使用批量操作减少数据库往返

### 2. ORM 查询优化

- 避免深层嵌套 include
- 使用 select 只查询需要的字段
- 对于复杂查询，考虑使用原始 SQL

### 3. 并发处理优化

- 调整 Worker 的并发数
- 使用连接池管理数据库连接
- 监控队列积压情况

## 故障排查

### 1. 任务队列问题

**问题**：任务没有被处理
- 检查 Worker 是否正常运行
- 检查 `job_queue` 表中的任务状态
- 查看 Worker 日志中的错误信息

**问题**：任务重复处理
- 确认 `SELECT FOR UPDATE` 正常工作
- 检查事务隔离级别

### 2. ORM 查询问题

**问题**：include 查询返回空数据
- 检查关系配置是否正确
- 确认关联字段的数据类型匹配
- 查看生成的 SQL 语句

**问题**：查询性能差
- 检查是否缺少索引
- 考虑减少嵌套层级
- 使用 select 限制返回字段

## 未来改进方向

1. **批量查询优化**：实现批量 include 查询，减少数据库往返
2. **缓存层**：使用 TongRDS 缓存常用查询结果
3. **监控指标**：添加队列处理延迟、成功率等指标
4. **分布式锁**：实现更 robust 的分布式锁机制
5. **死信队列**：处理多次重试失败的任务

## 总结

通过以上实现，DM8 + TongRDS 方案已经能够完全替代 PostgreSQL + Redis，实现所有核心功能：

✅ **Worker 队列**：使用数据库队列替代 BullMQ，解决 Lua 脚本兼容性问题
✅ **ORM 查询**：支持 include/select 嵌套查询，功能对齐 Prisma
✅ **健康检查**：适配 DM8 模式，检查数据库和队列状态
✅ **并发处理**：使用 SELECT FOR UPDATE 确保任务不被重复处理
✅ **重试机制**：实现指数退避重试，提高任务成功率

该方案在功能完整性、可靠性和可维护性方面都达到了生产级别要求。
