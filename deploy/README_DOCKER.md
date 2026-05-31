# Docker 部署快速指南

## 🚀 一键部署

```bash
# 1. 配置环境变量
cp .env.docker .env
vi .env  # 修改数据库连接信息

# 2. 运行部署脚本
./scripts/docker-deploy.sh
```

## 📋 手动部署步骤

### 步骤 1: 配置环境变量

```bash
# 复制模板
cp .env.docker .env

# 编辑配置
vi .env
```

修改以下关键配置：
```bash
# DM8 数据库连接
DATABASE_URL=dm://SYSDBA:YourPassword@192.168.1.100:5236

# TongRDS 连接
REDIS_HOST=192.168.1.101
REDIS_PORT=6379
REDIS_AUTH=YourRedisPassword
```

### 步骤 2: 构建镜像

```bash
docker compose build
```

### 步骤 3: 初始化数据库

如果数据库还没有初始化：
```bash
docker exec -i dm8_container /opt/dmdbms/bin/disql SYSDBA/Password < deploy/dm8_init.sql
```

### 步骤 4: 启动服务

```bash
docker compose up -d
```

### 步骤 5: 验证部署

```bash
# 查看服务状态
docker compose ps

# 检查健康状态
curl http://localhost:3000/api/public/health
```

### 步骤 6: 登录系统

- 地址: http://localhost:3000
- 邮箱: `administrator@orbitai.com`
- 密码: `administrator`

## 📁 文件说明

### 配置文件
- `.env.docker` - 环境变量模板
- `docker-compose.yaml` - Docker Compose 配置
- `Dockerfile.dm8` - Docker 镜像构建文件

### 脚本文件
- `scripts/docker-deploy.sh` - 一键部署脚本

### 文档文件
- `deploy/DOCKER_DEPLOYMENT_GUIDE.md` - 详细部署指南
- `deploy/EXTERNAL_DB_CONNECTION_GUIDE.md` - 外部数据库连接指南

## 🔧 常用命令

### 服务管理
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
```

### 镜像管理
```bash
# 构建镜像
docker compose build

# 重新构建
docker compose build --no-cache

# 推送镜像
docker compose push
```

### 调试命令
```bash
# 进入容器
docker exec -it langfuse-web /bin/sh

# 查看容器日志
docker logs langfuse-web

# 查看容器详情
docker inspect langfuse-web
```

## 🔍 故障排查

### 问题 1: 服务启动失败
```bash
# 查看日志
docker compose logs langfuse-web
docker compose logs langfuse-worker

# 检查配置
docker compose config
```

### 问题 2: 数据库连接失败
```bash
# 测试网络连通性
docker exec langfuse-web ping 192.168.1.100
docker exec langfuse-web telnet 192.168.1.100 5236
```

### 问题 3: 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3000

# 修改端口
vi .env
# WEB_PORT=8080

# 重启服务
docker compose down
docker compose up -d
```

## 📊 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Host                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  langfuse-web   │  │ langfuse-worker │                  │
│  │   (Port 3000)   │  │   (Port 3030)   │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
└───────────┼────────────────────┼────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────┐    ┌─────────────────┐
│   DM8 Database  │    │     TongRDS     │
│  (External)     │    │   (External)    │
│  192.168.1.100  │    │  192.168.1.101  │
└─────────────────┘    └─────────────────┘
```

## 🔒 安全建议

1. **修改默认密码**: 生产环境必须修改所有默认密码
2. **使用强密码**: 密码长度至少 12 位
3. **限制网络访问**: 使用防火墙限制数据库访问 IP
4. **启用 HTTPS**: 使用反向代理启用 HTTPS
5. **定期备份**: 定期备份数据库和配置文件

## 📈 性能优化

### 1. 资源限制
```yaml
services:
  langfuse-web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### 2. 日志管理
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 3. 重启策略
```yaml
restart: unless-stopped
```

## 📚 更多文档

- [详细部署指南](DOCKER_DEPLOYMENT_GUIDE.md)
- [外部数据库连接指南](EXTERNAL_DB_CONNECTION_GUIDE.md)
- [DM8 + TongRDS 实现文档](DM8_TONGRDS_IMPLEMENTATION.md)
- [实现总结](IMPLEMENTATION_SUMMARY.md)

## 🆘 技术支持

遇到问题时，请提供：
1. Docker 版本: `docker --version`
2. Docker Compose 版本: `docker compose version`
3. 错误日志: `docker compose logs`
4. 服务状态: `docker compose ps`

## ✅ 部署检查清单

- [ ] Docker 和 Docker Compose 已安装
- [ ] DM8 数据库可访问
- [ ] TongRDS 可访问
- [ ] .env 文件已配置
- [ ] 数据库已初始化
- [ ] Docker 镜像已构建
- [ ] 服务已启动
- [ ] 健康检查通过
- [ ] 登录测试成功

## 🎯 下一步

1. 配置 `.env` 文件
2. 运行 `./scripts/docker-deploy.sh`
3. 访问 http://localhost:3000 登录
4. 开始使用 Langfuse！

祝你部署顺利！🎉
