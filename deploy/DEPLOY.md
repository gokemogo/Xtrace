# DeepTrace 部署指南

## 📋 前置条件

- ✅ DM8 数据库已部署并可访问
- ✅ Docker 已安装
- ✅ 已获取 DM8 连接信息（IP、端口、用户名、密码）

**注意：不需要 Redis/TongRDS！**

## 🚀 快速部署

### 步骤 1: 打包镜像（在开发机器上）

```bash
# 进入项目根目录
cd /data/deeptrace

# 构建 Docker 镜像
docker build -f Dockerfile.dm8 -t deeptrace:latest .

# 导出镜像为文件
docker save deeptrace:latest | gzip > deeptrace.tar.gz
```

### 步骤 2: 传输文件到部署服务器

需要传输的文件：
```bash
deeptrace.tar.gz              # Docker 镜像
deploy/docker-compose.yaml    # Docker Compose 配置
deploy/dm8_init.sql           # 数据库初始化脚本（如果数据库还没初始化）
```

传输命令：
```bash
scp deeptrace.tar.gz user@server:/path/to/deploy/
scp deploy/docker-compose.yaml user@server:/path/to/deploy/
scp deploy/dm8_init.sql user@server:/path/to/deploy/
```

### 步骤 3: 在部署服务器上配置

```bash
# 进入部署目录
cd /path/to/deploy

# 加载 Docker 镜像
docker load < deeptrace.tar.gz

# 编辑配置文件
vi docker-compose.yaml
```

修改 `docker-compose.yaml` 文件中的关键配置：

```yaml
# DM8 数据库连接（两个服务都要改）
- DATABASE_URL=dm://SYSDBA:YourPassword@192.168.1.100:5236

# 安全配置（必须修改为随机值）
- NEXTAUTH_SECRET=your-random-secret-key
- SALT=your-random-salt
- ENCRYPTION_KEY=your-random-encryption-key
```

### 步骤 4: 初始化数据库（如果还没初始化）

```bash
# 使用 DM8 客户端执行初始化脚本
./disql SYSDBA/YourPassword@192.168.1.100:5236 < dm8_init.sql

# 或者如果 DM8 在 Docker 中
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/YourPassword < dm8_init.sql
```

### 步骤 5: 启动服务

```bash
# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 步骤 6: 验证部署

```bash
# 检查健康状态
curl http://localhost:3000/api/public/health

# 预期返回
# {"status":"ok","version":"2.65.1"}
```

### 步骤 7: 登录系统

1. 打开浏览器：http://your-server-ip:3000
2. 使用默认账号登录：
   - 邮箱：`administrator@orbitai.com`
   - 密码：`administrator`

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.yaml` | Docker Compose 配置文件 |
| `dm8_init.sql` | DM8 数据库初始化脚本 |
| `dm8_seed_data.sql` | DM8 种子数据脚本（可选） |
| `deeptrace.tar.gz` | Docker 镜像文件 |

## 🔧 配置详解

### 环境变量说明

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | ✅ | DM8 连接字符串 | `dm://SYSDBA:pass@192.168.1.100:5236` |
| `NEXTAUTH_SECRET` | ✅ | NextAuth 密钥 | 随机字符串 |
| `SALT` | ✅ | 密码盐值 | 随机字符串 |
| `ENCRYPTION_KEY` | ✅ | 加密密钥 | 64位十六进制字符串 |
| `WEB_PORT` | ❌ | Web 应用端口 | `3000` |
| `WORKER_PORT` | ❌ | Worker 服务端口 | `5001` |

### 生成安全密钥

```bash
# 生成 NextAuth 密钥
openssl rand -base64 32

# 生成密码盐值
openssl rand -hex 16

# 生成加密密钥
openssl rand -hex 32
```

## 🔍 故障排查

### 问题 1: 服务启动失败

```bash
# 查看日志
docker compose logs deeptrace-web
docker compose logs deeptrace-worker
```

### 问题 2: 数据库连接失败

```bash
# 测试网络连通性
docker exec deeptrace-web ping 192.168.1.100
docker exec deeptrace-web telnet 192.168.1.100 5236
```

### 问题 3: 登录失败

```bash
# 检查数据库是否已初始化
# 连接 DM8 数据库检查用户表
SELECT COUNT(*) FROM "users";
```

## 📊 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 应用 | 3000 | 浏览器访问 |
| Worker 服务 | 5001 | 后台任务处理 |

## 🔒 安全建议

1. **修改默认密码**：首次登录后立即修改管理员密码
2. **使用强密码**：密码长度至少 12 位
3. **限制网络访问**：使用防火墙限制访问 IP
4. **启用 HTTPS**：使用反向代理启用 HTTPS
5. **定期备份**：定期备份数据库

## 📝 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 进入容器
docker exec -it deeptrace-web /bin/sh
```

## 🔄 更新部署

```bash
# 1. 构建新镜像
docker build -f Dockerfile.dm8 -t deeptrace:latest .

# 2. 导出镜像
docker save deeptrace:latest | gzip > deeptrace.tar.gz

# 3. 传输到部署服务器
scp deeptrace.tar.gz user@server:/path/to/deploy/

# 4. 在部署服务器上更新
cd /path/to/deploy
docker load < deeptrace.tar.gz
docker compose down
docker compose up -d
```

## ✅ 部署检查清单

- [ ] DM8 数据库可访问
- [ ] Docker 镜像已构建
- [ ] 配置文件已修改
- [ ] 安全密钥已生成
- [ ] 数据库已初始化
- [ ] 服务已启动
- [ ] 健康检查通过
- [ ] 登录测试成功

## ✨ 架构优势

- ✅ **简单**：只需一个数据库（DM8）
- ✅ **高效**：任务队列使用数据库实现
- ✅ **可靠**：无需额外组件（Redis/TongRDS）
- ✅ **易维护**：减少依赖，降低复杂度

## 📞 技术支持

遇到问题时，请提供：
1. 错误日志：`docker compose logs`
2. 服务状态：`docker compose ps`
3. 配置信息：隐藏敏感信息后的 `docker-compose.yaml`
4. 网络测试结果：ping 和 telnet 测试
