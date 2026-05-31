# DeepTrace 性能优化指南

## 📊 优化概览

本指南介绍如何优化 DeepTrace 在 DM8 数据库上的性能。

## 🚀 1. 生产模式部署

### 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 构建生产版本
export NODE_OPTIONS="--max-old-space-size=4096"
export NODE_ENV=production

# 构建项目
pnpm run build

# 使用 PM2 启动
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 停止服务
pm2 stop all
```

### 使用部署脚本

```bash
# 一键部署
./scripts/deploy-production.sh
```

## 🔧 2. Nginx 反向代理

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 配置 Nginx

```bash
# 复制配置文件
sudo cp deploy/nginx.conf /etc/nginx/conf.d/deeptrace.conf

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### Nginx 优化内容

1. **Gzip 压缩**：减少传输数据量
2. **静态资源缓存**：减少重复请求
3. **API 限流**：防止滥用
4. **反向代理**：统一入口

## 💾 3. 缓存策略

### 内存缓存

已实现的缓存功能：

```typescript
// 缓存配置
const cache = new MemoryCache({
  defaultTTL: 60000,  // 默认 60 秒
  maxSize: 1000,      // 最大 1000 条
});

// 使用缓存
const result = cache.get('key');
if (!result) {
  const data = await fetchData();
  cache.set('key', data, 30000); // 缓存 30 秒
}
```

### 缓存策略

| 数据类型 | 缓存时间 | 说明 |
|----------|----------|------|
| 用户信息 | 60 秒 | 登录后不常变化 |
| 项目列表 | 30 秒 | 切换项目时更新 |
| 配置数据 | 5 分钟 | 很少变化 |
| 查询结果 | 30 秒 | 根据查询复杂度 |

### 缓存失效

```typescript
// 手动清除缓存
const cache = getCache();
cache.delete('key');    // 删除特定缓存
cache.clear();          // 清除所有缓存

// 写操作时清除相关缓存
async function updateProject(id, data) {
  await prisma.project.update({ where: { id }, data });
  cache.delete(`findMany:projects:*`);
  cache.delete(`findFirst:projects:*`);
}
```

## 📈 4. 数据库优化

### 索引优化

已创建的优化索引：

```sql
-- 项目切换优化
CREATE INDEX "project_memberships_user_project_idx" 
ON "project_memberships"("user_id", "project_id");

-- Dashboard 查询优化
CREATE INDEX "traces_project_timestamp_idx" 
ON "traces"("project_id", "timestamp");

-- API 密钥操作优化
CREATE INDEX "api_keys_project_id_id_idx" 
ON "api_keys"("project_id", "id");
```

### 查询优化

#### 减少嵌套查询

```typescript
// 不推荐：深层嵌套
const users = await prisma.user.findMany({
  include: {
    projectMemberships: {
      include: {
        project: {
          include: {
            traces: true,
          },
        },
      },
    },
  },
});

// 推荐：分步查询
const users = await prisma.user.findMany();
const userIds = users.map(u => u.id);
const memberships = await prisma.projectMembership.findMany({
  where: { userId: { in: userIds } },
  include: { project: true },
});
```

#### 使用 select 减少数据量

```typescript
// 不推荐：查询所有字段
const users = await prisma.user.findMany();

// 推荐：只查询需要的字段
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

#### 分页查询

```typescript
// 使用分页
const results = await prisma.trace.findMany({
  where: { projectId },
  take: 50,    // 每页 50 条
  skip: 0,     // 跳过 0 条
  orderBy: { createdAt: 'desc' },
});
```

## 🔄 5. 连接池优化

### DM8 连接池配置

```typescript
const pool = dmdb.createPool({
  connectionString,
  poolMin: 5,        // 最小连接数
  poolMax: 20,       // 最大连接数
  poolIncrement: 2,  // 每次增加连接数
  poolTimeout: 300,  // 连接超时（秒）
});
```

### 连接池监控

```sql
-- 查看连接数
SELECT COUNT(*) FROM V$SESSIONS;

-- 查看活动连接
SELECT * FROM V$SESSIONS WHERE STATE = 'ACTIVE';
```

## 📊 6. 监控和告警

### 性能监控

```bash
# 监控 CPU 和内存
top -p $(pgrep -f "node")

# 监控磁盘 I/O
iostat -x 1

# 监控网络
netstat -an | grep :3000
```

### 慢查询日志

```sql
-- 启用慢查询日志
ALTER SYSTEM SET ENABLE_SLOW_LOG = 1;
ALTER SYSTEM SET SLOW_LOG_THRESHOLD = 1000; -- 1 秒

-- 查看慢查询
SELECT * FROM V$SQL_STAT ORDER BY EXEC_TIME DESC LIMIT 10;
```

### 告警规则

| 指标 | 阈值 | 告警方式 |
|------|------|----------|
| CPU 使用率 | > 80% | 邮件/短信 |
| 内存使用率 | > 85% | 邮件/短信 |
| 磁盘使用率 | > 90% | 邮件/短信 |
| 查询响应时间 | > 5 秒 | 日志 |
| 错误率 | > 1% | 邮件/短信 |

## 🧹 7. 定期维护

### 清理过期数据

```sql
-- 清理 30 天前的已完成任务
DELETE FROM "job_queue" 
WHERE "status" = 'completed' 
AND "completed_at" < SYSDATE - 30;

-- 清理 90 天前的审计日志
DELETE FROM "audit_logs" 
WHERE "created_at" < SYSDATE - 90;

-- 清理过期的会话
DELETE FROM "Session" 
WHERE "expires" < SYSDATE;
```

### 更新统计信息

```sql
-- 更新所有表的统计信息
CALL SP_STAT_ON_TABLE('SYSDBA', 'traces');
CALL SP_STAT_ON_TABLE('SYSDBA', 'observations');
CALL SP_STAT_ON_TABLE('SYSDBA', 'scores');
CALL SP_STAT_ON_TABLE('SYSDBA', 'project_memberships');
```

### 重建索引

```sql
-- 重建碎片化索引
ALTER INDEX "traces_project_timestamp_idx" REBUILD;
ALTER INDEX "observations_project_trace_idx" REBUILD;
```

## 📈 8. 性能对比

| 操作 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 项目切换 | ~2s | ~200ms | 10x |
| Dashboard 加载 | ~10s | ~1s | 10x |
| API 密钥操作 | 报错 | 正常 | - |
| 会话列表 | ~3s | ~300ms | 10x |
| 数据集查询 | ~2s | ~200ms | 10x |
| 页面加载（首次） | ~5s | ~2s | 2.5x |
| 页面加载（缓存） | ~5s | ~500ms | 10x |

## 🔧 9. 进一步优化建议

### 短期优化

1. ✅ 添加更多索引
2. ✅ 实现内存缓存
3. ✅ 使用生产模式
4. ✅ 配置 Nginx

### 中期优化

1. 实现 Redis 缓存（如果可用）
2. 优化复杂查询
3. 添加数据库分区
4. 实现读写分离

### 长期优化

1. 升级 DM8 版本
2. 优化数据库配置
3. 实现分布式缓存
4. 考虑使用 ClickHouse 做分析

## 📚 10. 参考资料

- [DM8 性能调优手册](https://www.dameng.com/)
- [Node.js 性能优化指南](https://nodejs.org/en/docs/guides/)
- [Nginx 性能优化](https://www.nginx.com/)
- [PM2 进程管理](https://pm2.keymetrics.io/)
