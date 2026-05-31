# DeepTrace 部署说明

## 🎯 架构说明

**只需 DM8 数据库，无需 Redis/TongRDS！**

```
┌─────────────────────────────────────────────────────────┐
│                     部署服务器                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  deeptrace-web  │  │ deeptrace-worker│              │
│  │   (Port 3000)   │  │   (Port 5001)   │              │
│  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                        │
│           └─────────┬──────────┘                        │
│                     ▼                                   │
│            ┌─────────────────┐                          │
│            │       DM8       │                          │
│            │  (数据+任务队列) │                          │
│            │  192.168.1.100  │                          │
│            └─────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 快速部署

### 步骤 1: 打包镜像

```bash
cd /data/deeptrace
docker build -f Dockerfile.dm8 -t deeptrace:latest .
docker save deeptrace:latest | gzip > deeptrace.tar.gz
```

### 步骤 2: 传输文件

将以下文件传输到部署服务器：
- `deeptrace.tar.gz` - Docker 镜像
- `deploy/docker-compose.yaml` - 部署配置
- `deploy/dm8_init.sql` - 数据库初始化脚本（如果数据库还没初始化）

### 步骤 3: 部署

```bash
# 加载镜像
docker load < deeptrace.tar.gz

# 编辑配置（修改数据库连接信息）
vi docker-compose.yaml

# 启动服务
docker compose up -d
```

## 📝 修改配置

打开 `docker-compose.yaml`，修改以下配置：

### 必须修改的配置

```yaml
# DM8 数据库连接（两个服务都要改）
- DATABASE_URL=dm://SYSDBA:你的密码@DM8的IP:5236

# 安全配置（生成随机值）
- NEXTAUTH_SECRET=随机字符串
- SALT=随机字符串
- ENCRYPTION_KEY=随机字符串
```

### 生成安全密钥

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成 SALT
openssl rand -hex 16

# 生成 ENCRYPTION_KEY
openssl rand -hex 32
```

### 可选修改

```yaml
# 端口配置
ports:
  - "3000:5000"   # Web 端口
  - "5001:5001"   # Worker 端口

# NextAuth 回调地址
- NEXTAUTH_URL=http://你的域名:3000
```

## ✅ 验证部署

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 检查健康状态
curl http://localhost:3000/api/public/health
```

## 🔐 登录系统

- 地址: http://localhost:3000
- 邮箱: `administrator@orbitai.com`
- 密码: `administrator`

## 📋 配置示例

```yaml
# DM8 数据库
- DATABASE_URL=dm://SYSDBA:MyPassword123@192.168.1.100:5236

# 安全配置
- NEXTAUTH_SECRET=a1b2c3d4e5f6g7h8i9j0
- SALT=1a2b3c4d5e6f7g8h
- ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

## 🔧 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 查看状态
docker compose ps

# 进入容器
docker exec -it deeptrace-web /bin/sh
```

## 🔍 故障排查

### 服务启动失败

```bash
docker compose logs deeptrace-web
docker compose logs deeptrace-worker
```

### 数据库连接失败

```bash
# 测试网络
docker exec deeptrace-web ping 192.168.1.100
docker exec deeptrace-web telnet 192.168.1.100 5236
```

## 📊 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Web | 3000 | 浏览器访问 |
| Worker | 5001 | 后台任务 |

## ✨ 特点

- ✅ 只需 DM8 数据库
- ✅ 无需 Redis/TongRDS
- ✅ 任务队列使用数据库实现
- ✅ 会话存储使用数据库实现
- ✅ 配置简单，部署方便
