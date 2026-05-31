# 外部数据库连接指南

## 概述

当 DM8 和 TongRDS 由其他人部署时，本指南帮助你配置连接并测试系统。

## 快速开始

### 方法一：使用配置脚本（推荐）

```bash
# 运行配置脚本
./scripts/configure-external-db.sh
```

脚本会提示你输入：
- DM8 数据库 IP、端口、用户名、密码
- TongRDS IP、端口、密码

然后自动生成 `.env` 配置文件。

### 方法二：手动配置

1. 复制配置模板：
```bash
cp .env.external-db .env
```

2. 编辑 `.env` 文件，替换以下信息：

```bash
# DM8 数据库连接
DATABASE_URL=dm://用户名:密码@IP地址:端口

# TongRDS 连接
REDIS_HOST=IP地址
REDIS_PORT=端口
REDIS_AUTH=密码
```

**示例**：
```bash
# DM8 数据库
DATABASE_URL=dm://SYSDBA:MyPassword123@192.168.1.100:5236

# TongRDS
REDIS_HOST=192.168.1.101
REDIS_PORT=6379
REDIS_AUTH=RedisPassword123
```

## 测试连接

### 1. 测试数据库连接

```bash
npx ts-node scripts/test-external-db-connection.ts
```

预期输出：
```
🔍 开始测试外部数据库连接...

=== 测试 DM8 数据库连接 ===
连接字符串: dm://SYSDBA:***@192.168.1.100:5236
✅ DM8 连接成功
✅ DM8 查询测试成功
✅ job_queue 表存在

=== 测试 TongRDS (Redis) 连接 ===
主机: 192.168.1.101:6379
✅ TongRDS 连接成功, PING: PONG
✅ TongRDS 读写测试成功

=== 测试结果汇总 ===
DM8 数据库: ✅ 成功
TongRDS: ✅ 成功

🎉 所有数据库连接正常，可以启动服务
```

### 2. 初始化数据库（如果还没有执行）

```bash
# 使用 DM8 客户端工具执行初始化脚本
# 方式 1: 使用 docker exec（如果 DM8 在 Docker 中）
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/MyPassword123 < deploy/dm8_init.sql

# 方式 2: 使用本地 DM8 客户端
./disql SYSDBA/MyPassword123@192.168.1.100:5236 < deploy/dm8_init.sql
```

### 3. 启动服务

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 启动开发服务器
pnpm run dev
```

### 4. 测试登录

1. 打开浏览器访问: http://localhost:3000
2. 使用默认账号登录：
   - 邮箱: `administrator@orbitai.com`
   - 密码: `administrator`

## 使用 Docker Compose 部署

如果要使用 Docker Compose 部署连接外部数据库：

1. 编辑 `deploy/docker-compose-external-db.yaml`，替换数据库连接信息

2. 启动服务：
```bash
docker compose -f deploy/docker-compose-external-db.yaml up -d
```

3. 查看日志：
```bash
docker compose -f deploy/docker-compose-external-db.yaml logs -f
```

## 常见问题

### Q1: DM8 连接失败

**错误信息**: `connect ECONNREFUSED 192.168.1.100:5236`

**可能原因**：
1. DM8 服务未启动
2. IP 地址或端口错误
3. 防火墙阻止连接

**解决方法**：
```bash
# 测试网络连通性
ping 192.168.1.100
telnet 192.168.1.100 5236

# 检查 DM8 服务状态
# 联系 DM8 管理员确认服务是否正常
```

### Q2: TongRDS 连接失败

**错误信息**: `WRONGPASS invalid username-password pair`

**可能原因**：
1. 密码错误
2. TongRDS 需要用户名认证

**解决方法**：
```bash
# 检查 TongRDS 配置
# 联系 TongRDS 管理员获取正确的连接信息
```

### Q3: 登录后页面空白

**可能原因**：
1. 数据库未初始化
2. 用户表为空

**解决方法**：
```bash
# 检查用户表
# 使用 DM8 客户端连接数据库
SELECT * FROM "users";

# 如果用户表为空，执行初始化脚本
```

### Q4: 任务队列不工作

**可能原因**：
1. job_queue 表不存在
2. Worker 服务未启动

**解决方法**：
```bash
# 检查 job_queue 表
SELECT COUNT(*) FROM "job_queue";

# 如果表不存在，执行初始化脚本
# 检查 Worker 日志
```

## 数据库连接字符串格式

### DM8 连接字符串

```
dm://用户名:密码@IP地址:端口
```

**示例**：
```
dm://SYSDBA:Deeptrace2025@192.168.1.100:5236
dm://myuser:mypass@10.0.0.5:5236
```

### TongRDS (Redis) 连接

```bash
# 无密码
REDIS_HOST=192.168.1.101
REDIS_PORT=6379
REDIS_AUTH=

# 有密码
REDIS_HOST=192.168.1.101
REDIS_PORT=6379
REDIS_AUTH=mypassword

# 使用连接字符串（可选）
REDIS_CONNECTION_STRING=redis://:password@host:port
```

## 安全建议

1. **不要在代码中硬编码密码**：使用环境变量或 `.env` 文件
2. **限制数据库访问权限**：只授予必要的权限
3. **使用强密码**：避免使用简单密码
4. **定期更换密码**：定期更新数据库密码
5. **加密敏感信息**：对敏感配置进行加密

## 监控和维护

### 检查数据库连接

```bash
# 检查 DM8 连接
npx ts-node scripts/test-external-db-connection.ts

# 检查健康状态
curl http://localhost:3000/api/public/health
```

### 查看日志

```bash
# 查看应用日志
tail -f logs/app.log

# 查看 Worker 日志
tail -f logs/worker.log
```

### 数据库维护

```sql
-- 清理过期任务
DELETE FROM "job_queue" WHERE "status" = 'completed' AND "completed_at" < SYSDATE - 30;

-- 重建索引
ALTER INDEX "job_queue_status_queue_name_idx" REBUILD;
```

## 技术支持

如果遇到问题，请提供以下信息：

1. 错误信息和日志
2. 数据库版本信息
3. 网络连通性测试结果
4. 配置文件内容（隐藏密码）

联系技术支持时，请附上这些信息以便快速定位问题。
