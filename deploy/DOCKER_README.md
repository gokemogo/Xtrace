# DeepTrace Docker 部署指南

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [构建镜像](#构建镜像)
- [部署服务](#部署服务)
- [常用命令](#常用命令)
- [故障排除](#故障排除)

## 🎯 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 外部 DM8 数据库（已部署）
- 外部 TongRDS/Redis（已部署）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd deeptrace
```

### 2. 修改配置

编辑 `docker-compose.yaml`，修改以下配置：

```yaml
# DM8 数据库连接
- DATABASE_URL=dm://用户名:密码@IP地址:端口

# TongRDS 连接
- REDIS_HOST=IP地址
- REDIS_PORT=端口
- REDIS_AUTH=密码（如有）

# 安全配置（务必修改！）
- NEXTAUTH_SECRET=你的密钥
- SALT=你的盐值
- LANGFUSE_WORKER_PASSWORD=你的密码
- ENCRYPTION_KEY=你的加密密钥
```

### 3. 构建并启动

```bash
# 构建镜像
./scripts/build-multiarch.sh

# 启动服务
docker-compose up -d
```

### 4. 访问服务

- Web 界面: http://localhost:3000
- 健康检查: http://localhost:3000/api/public/health

## 📝 配置说明

### DM8 数据库配置

```yaml
# 数据库类型
- DB_TYPE=dm8

# DM8 连接字符串
# 格式: dm://用户名:密码@IP地址:端口
- DATABASE_URL=dm://SYSDBA:Deeptrace2025@192.168.1.100:5236
```

### TongRDS (Redis) 配置

```yaml
# Redis/TongRDS 连接
- REDIS_HOST=192.168.1.100      # IP 地址
- REDIS_PORT=6379               # 端口
- REDIS_AUTH=                   # 密码（如有）
- REDIS_DB=0                    # 数据库编号
- REDIS_KEY_PREFIX=deeptrace:   # 键前缀
- REDIS_DEFAULT_TTL=60          # 默认缓存时间（秒）
```

### 安全配置

```yaml
# NextAuth 配置
- NEXTAUTH_URL=http://your-domain.com
- NEXTAUTH_SECRET=<随机生成的密钥>

# 安全配置
- SALT=<随机生成的盐值>
- LANGFUSE_WORKER_PASSWORD=<强密码>
- ENCRYPTION_KEY=<64位随机十六进制字符串>
```

生成安全配置：

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成 SALT
openssl rand -base64 16

# 生成 ENCRYPTION_KEY
openssl rand -hex 32
```

## 🔨 构建镜像

### 本地构建（单架构）

```bash
# 使用通用 Dockerfile
docker build -f Dockerfile.universal -t deeptrace:latest .
```

### 多架构构建

```bash
# 构建 AMD64 和 ARM64 镜像
./scripts/build-multiarch.sh

# 指定标签
./scripts/build-multiarch.sh -t v1.0.0

# 构建并推送到镜像仓库
./scripts/build-multiarch.sh -p -r registry.example.com
```

### 手动构建特定架构

```bash
# 只构建 AMD64
docker buildx build --platform linux/amd64 -f Dockerfile.universal -t deeptrace:amd64 --load .

# 只构建 ARM64
docker buildx build --platform linux/arm64 -f Dockerfile.universal -t deeptrace:arm64 --load .
```

## 🚢 部署服务

### 启动服务

```bash
# 前台启动（查看日志）
docker-compose up

# 后台启动
docker-compose up -d

# 只启动 Web 服务
docker-compose up -d deeptrace-web

# 只启动 Worker 服务
docker-compose up -d deeptrace-worker
```

### 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 查看 Web 日志
docker-compose logs -f deeptrace-web

# 查看 Worker 日志
docker-compose logs -f deeptrace-worker
```

### 停止服务

```bash
# 停止服务
docker-compose down

# 停止服务并删除数据
docker-compose down -v
```

## 🔧 常用命令

### 服务管理

```bash
# 查看服务状态
docker-compose ps

# 重启服务
docker-compose restart

# 重启单个服务
docker-compose restart deeptrace-web

# 查看服务资源使用
docker-compose top
```

### 进入容器

```bash
# 进入 Web 容器
docker-compose exec deeptrace-web sh

# 进入 Worker 容器
docker-compose exec deeptrace-worker sh
```

### 数据库操作

```bash
# 运行数据库迁移
docker-compose exec deeptrace-web npx prisma migrate deploy

# 查看数据库状态
docker-compose exec deeptrace-web npx prisma migrate status
```

## 🔍 故障排除

### 服务无法启动

1. **检查日志**
   ```bash
   docker-compose logs deeptrace-web
   docker-compose logs deeptrace-worker
   ```

2. **检查数据库连接**
   ```bash
   # 测试 DM8 连接
   docker-compose exec deeptrace-web node -e "
   const dmdb = require('dmdb');
   dmdb.createPool({connectionString: process.env.DATABASE_URL})
     .then(pool => pool.getConnection())
     .then(conn => {console.log('✅ DM8 连接成功'); conn.close();})
     .catch(err => console.error('❌ DM8 连接失败:', err));
   "
   ```

3. **检查 Redis 连接**
   ```bash
   # 测试 Redis 连接
   docker-compose exec deeptrace-web node -e "
   const Redis = require('ioredis');
   const r = new Redis({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT});
   r.ping()
     .then(res => {console.log('✅ Redis PING:', res); r.quit();})
     .catch(err => {console.error('❌ Redis 连接失败:', err); r.quit();});
   "
   ```

### 健康检查失败

```bash
# 手动检查健康状态
curl http://localhost:3000/api/public/health

# 查看容器健康状态
docker inspect --format='{{.State.Health.Status}}' deeptrace-web
```

### 性能问题

1. **增加资源限制**
   ```yaml
   # 在 docker-compose.yaml 中添加
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 4G
       reservations:
         cpus: '1'
         memory: 2G
   ```

2. **优化 DM8 配置**
   ```bash
   # 运行优化脚本
   docker-compose exec deeptrace-web node scripts/optimize-dm8.js
   ```

### 内存不足

```bash
# 查看容器资源使用
docker stats

# 增加 Node.js 内存限制
# 在 docker-compose.yaml 中添加
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

## 📚 相关文档

- [DM8 初始化脚本](dm8_init.sql)
- [DM8 优化指南](DM8_OPTIMIZATION.md)
- [性能优化指南](PERFORMANCE_OPTIMIZATION.md)
- [TongRDS 优化指南](TONGRDS_OPTIMIZATION.md)

## 🆘 获取帮助

如果遇到问题：

1. 查看 [故障排除](#故障排除) 部分
2. 检查 GitHub Issues
3. 联系技术支持

## 📄 许可证

[许可证类型]
