# 外部数据库部署指南

## 快速开始

### 步骤 1: 配置数据库连接

**方法 A: 使用配置脚本（推荐）**
```bash
./scripts/configure-external-db.sh
```

**方法 B: 手动配置**
```bash
# 复制模板
cp .env.external-db .env

# 编辑 .env 文件，替换数据库连接信息
vi .env
```

需要替换的信息：
```bash
# DM8 数据库
DATABASE_URL=dm://用户名:密码@IP地址:端口

# TongRDS
REDIS_HOST=IP地址
REDIS_PORT=端口
REDIS_AUTH=密码
```

### 步骤 2: 测试数据库连接

```bash
npx ts-node scripts/test-external-db-connection.ts
```

预期输出：
```
✅ DM8 连接成功
✅ TongRDS 连接成功
🎉 所有数据库连接正常
```

### 步骤 3: 初始化数据库

如果数据库还没有初始化：

```bash
# 使用 DM8 客户端执行初始化脚本
# 方式 1: Docker exec
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/密码 < deploy/dm8_init.sql

# 方式 2: 本地客户端
./disql SYSDBA/密码@IP:端口 < deploy/dm8_init.sql
```

### 步骤 4: 测试登录功能

```bash
npx ts-node scripts/test-login.ts
```

### 步骤 5: 启动服务

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 启动服务
pnpm run dev
```

### 步骤 6: 登录系统

1. 打开浏览器: http://localhost:3000
2. 输入账号:
   - 邮箱: `administrator@orbitai.com`
   - 密码: `administrator`
3. 点击登录

## 使用 Docker Compose 部署

### 编辑配置文件

编辑 `deploy/docker-compose-external-db.yaml`，替换数据库连接信息：

```yaml
environment:
  # DM8 数据库连接
  - DATABASE_URL=dm://SYSDBA:MyPassword@192.168.1.100:5236

  # TongRDS 连接
  - REDIS_HOST=192.168.1.101
  - REDIS_PORT=6379
  - REDIS_AUTH=RedisPassword
```

### 启动服务

```bash
docker compose -f deploy/docker-compose-external-db.yaml up -d
```

### 查看日志

```bash
docker compose -f deploy/docker-compose-external-db.yaml logs -f
```

## 文件说明

### 配置文件
- `.env` - 主配置文件
- `.env.external-db` - 外部数据库配置模板
- `deploy/docker-compose-external-db.yaml` - Docker Compose 配置

### 脚本文件
- `scripts/configure-external-db.sh` - 交互式配置脚本
- `scripts/test-external-db-connection.ts` - 测试数据库连接
- `scripts/test-login.ts` - 测试登录功能
- `scripts/switch-to-dm8.sh` - 切换到 DM8 模式
- `scripts/switch-to-pgsql.sh` - 切换到 PostgreSQL 模式

### 文档文件
- `deploy/EXTERNAL_DB_CONNECTION_GUIDE.md` - 详细连接指南
- `deploy/DM8_TONGRDS_IMPLEMENTATION.md` - 实现文档
- `deploy/IMPLEMENTATION_SUMMARY.md` - 实现总结

## 常见问题

### Q: 如何获取数据库连接信息？

联系数据库管理员获取：
- DM8: IP 地址、端口、用户名、密码
- TongRDS: IP 地址、端口、密码

### Q: 连接失败怎么办？

1. 检查网络连通性：
```bash
ping 数据库IP
telnet 数据库IP 端口
```

2. 检查防火墙设置

3. 确认数据库服务是否正常

### Q: 登录失败怎么办？

1. 检查数据库是否已初始化
2. 检查用户表是否有数据
3. 查看应用日志

### Q: 任务队列不工作？

1. 检查 job_queue 表是否存在
2. 检查 Worker 服务是否启动
3. 查看 Worker 日志

## 监控和维护

### 健康检查

```bash
# 检查 Web 服务
curl http://localhost:3000/api/public/health

# 检查 Worker 服务
curl http://localhost:3030/api/health
```

### 查看队列状态

```sql
-- 连接 DM8 数据库
SELECT status, COUNT(*) FROM "job_queue" GROUP BY status;
```

### 清理过期任务

```sql
DELETE FROM "job_queue"
WHERE "status" = 'completed'
AND "completed_at" < SYSDATE - 30;
```

## 技术支持

遇到问题时，请提供：
1. 错误信息和日志
2. 数据库版本
3. 网络测试结果
4. 配置文件内容（隐藏密码）

## 更多信息

- 详细连接指南: `deploy/EXTERNAL_DB_CONNECTION_GUIDE.md`
- 实现文档: `deploy/DM8_TONGRDS_IMPLEMENTATION.md`
- 实现总结: `deploy/IMPLEMENTATION_SUMMARY.md`
