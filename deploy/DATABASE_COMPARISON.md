# 数据库方案对比

## 架构对比

| 特性 | PostgreSQL + Redis | DM8 + TongRDS |
|------|-------------------|---------------|
| **数据库类型** | PostgreSQL (开源) | DM8 (达梦数据库) |
| **缓存类型** | Redis (开源) | TongRDS (国产) |
| **ORM 支持** | Prisma 完整支持 | 自定义适配层 |
| **稳定性** | ⭐⭐⭐⭐⭐ 生产级 | ⭐⭐⭐ 需要测试 |
| **性能** | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 良好 |
| **社区支持** | ⭐⭐⭐⭐⭐ 活跃 | ⭐⭐⭐ 国内为主 |
| **运维成本** | ⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 |

## 功能对比

| 功能 | PostgreSQL + Redis | DM8 + TongRDS |
|------|-------------------|---------------|
| 用户认证 | ✅ 完整支持 | ✅ 已适配 |
| Session 管理 | ✅ 完整支持 | ✅ 已适配 |
| ORM 查询 | ✅ 完整支持 | ⚠️ 部分支持 |
| 嵌套查询 | ✅ 完整支持 | ❌ 不支持 |
| 事务支持 | ✅ 完整支持 | ✅ 已适配 |
| 批量操作 | ✅ 完整支持 | ⚠️ 需要优化 |
| Worker 队列 | ✅ 完整支持 | ⚠️ Lua 脚本不兼容 |

## 切换方法

### 切换到 PostgreSQL + Redis

```bash
# 使用切换脚本
bash scripts/switch-to-pgsql.sh

# 或手动修改 .env
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/langfuse
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 切换到 DM8 + TongRDS

```bash
# 使用切换脚本
bash scripts/switch-to-dm8.sh

# 或手动修改 .env
DB_TYPE=dm8
DATABASE_URL=dm://SYSDBA:Deeptrace2025@localhost:5236
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 推荐方案

### 生产环境推荐

**PostgreSQL + Redis** 是最佳选择：

1. **稳定性** - 经过大规模生产验证
2. **性能** - 优秀的查询优化和缓存性能
3. **功能完整** - 所有功能完全支持
4. **运维简单** - 文档完善，社区支持好
5. **成本低** - 开源免费，无需额外授权

### 国产化要求

如果有国产化要求，**DM8 + TongRDS** 是可行方案：

1. **数据库** - DM8 是国产数据库，符合国产化要求
2. **缓存** - TongRDS 是国产缓存，兼容 Redis 协议
3. **适配** - 已完成基本功能适配
4. **限制** - 需要处理 Worker 队列兼容性问题

## 迁移建议

### 从 DM8 迁移到 PostgreSQL

1. 导出 DM8 数据
2. 转换数据格式
3. 导入到 PostgreSQL
4. 切换环境变量
5. 测试验证

### 从 PostgreSQL 迁移到 DM8

1. 导出 PostgreSQL 数据
2. 转换数据格式（注意类型差异）
3. 执行 dm8_init.sql
4. 导入数据
5. 切换环境变量
6. 测试验证

## 总结

| 场景 | 推荐方案 |
|------|----------|
| 生产环境（无国产化要求） | PostgreSQL + Redis |
| 生产环境（有国产化要求） | DM8 + TongRDS |
| 开发测试 | PostgreSQL + Redis |
| 国产化验证 | DM8 + TongRDS |

**建议**：优先使用 PostgreSQL + Redis 方案，确保系统稳定性。如有国产化要求，再使用 DM8 + TongRDS 方案，并进行充分测试。
