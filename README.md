# Deeptrace

<div align="center">
   <h3>基于 Langfuse v2 的开源 LLM 可观测性平台</h3>
</div>

---

## 项目简介

**Deeptrace** 是基于 [Langfuse v2.65.1](https://github.com/langfuse/langfuse) 进行二次开发的开源 LLM（大语言模型）可观测性平台。项目旨在帮助开发者更好地调试、分析和优化 AI 应用程序。

- **版本**: v2.65.1
- **架构**: Langfuse v2 稳定版架构（生产就绪）
- **原始项目**: [Langfuse](https://github.com/langfuse/langfuse)

---

## 核心功能

### 🔍 开发阶段

#### 可观测性
- **Trace 追踪**：全面的请求链路追踪，支持多种 LLM 框架集成
  - 完整的生命周期管理（创建、更新、查询）
  - 支持层级化的 Observation（SPAN、EVENT、GENERATION）
  - 自动计算延迟、Token 用量和成本
  - 支持外部 ID 关联和元数据存储
- **实时监控**：实时查看应用程序运行状态和性能指标
  - Session 会话管理和追踪
  - 多维度过滤和搜索（用户、标签、版本等）
  - 书签和公开分享功能
- **调试工具**：深入分析复杂的日志和调用链
  - 详细的输入输出记录
  - 模型参数和配置追踪
  - 完整的审计日志系统

#### Prompt 管理
- **版本控制**：管理和版本化 Prompt 模板
  - 支持自动版本递增
  - 标签（labels）系统，包括 "production" 标记
  - 创建者追踪和时间戳
- **集中部署**：从平台统一管理和部署 Prompt
  - JSON 格式存储 Prompt 定义
  - 支持模型配置参数（config）
  - 完整的 REST API（v1 和 v2）
- **LLM Playground**：在线测试和迭代 Prompt 效果
  - 支持多种 LLM 提供商
  - 实时测试和调试

### 📊 监控阶段

#### 数据分析
- **多维度指标**：追踪成本、延迟、质量等关键指标
  - 自动计算 Token 用量（输入、输出、总计）
  - 精确的成本追踪（基于模型定价）
  - 延迟和性能分析（包括首 Token 时间）
  - 支持多种计量单位（TOKENS、CHARACTERS、MILLISECONDS 等）
- **可视化仪表盘**：直观的数据可视化和趋势分析
  - 通用查询构建器支持复杂图表
  - 项目级别的使用统计
  - 自定义时间范围和过滤条件
- **数据导出**：支持多种格式的数据导出
  - 异步批量导出功能
  - CSV 等格式支持
  - 自动过期管理和 URL 生成

#### 评估与评分系统
- **评分系统**：完整的评分和反馈收集功能
  - 三种评分类型：数值型（NUMERIC）、分类型（CATEGORICAL）、布尔型（BOOLEAN）
  - 多种评分来源：API 提交、人工标注（ANNOTATION）
  - 支持自定义评分配置和规范
- **手动标注**：强大的人工标注和审核工具
  - 批量标注界面
  - 支持多维度评分
  - 评论和反馈收集
  - 完整的审计日志
- **用户反馈**：收集和分析用户反馈
  - 通过 API 提交评分
  - 关联到 Trace 或 Observation
  - 支持评论和上下文信息

### 🧪 测试阶段

#### 实验与数据集管理
- **数据集管理**：创建和管理测试数据集
  - 支持输入、预期输出、元数据存储
  - 可从历史 Trace 或 Observation 创建数据集项
  - 支持数据集项的版本管理和归档
  - 完整的 REST API 支持
- **测试运行**：在数据集上执行实验和基准测试
  - Dataset Runs 功能支持批量测试
  - 自动计算运行指标（平均延迟、成本、评分）
  - 在表格中查看不同运行的性能指标
  - 支持关联 Trace 和 Score 进行深度分析
- **A/B 测试**：通过 Dataset Runs 对比不同模型、Prompt 或参数配置
  - 并行运行多个实验
  - 自动聚合指标数据
  - 通过表格视图对比多个运行结果
- **基准验证**：在部署前验证预期的输入输出行为

---

## 技术架构

### 技术栈

**前端**
- Next.js 14（Pages Router）
- React 18
- TypeScript（严格模式）
- Tailwind CSS + shadcn/ui
- tRPC（类型安全的 API 调用）
- React Query（服务端状态管理）

**后端**
- Node.js 20
- Prisma ORM
- NextAuth.js（身份认证）
- PostgreSQL（主数据库）
- Redis（缓存和会话存储）

**开发工具**
- pnpm（包管理器）
- Turbo（Monorepo 构建系统）
- ESLint + Prettier（代码规范）
- Jest（单元测试）
- Playwright（E2E 测试）

### 项目结构

```
deeptrace/
├── web/                    # Next.js 主应用（前端 + API）
├── worker/                 # 后台任务处理服务（v3 实验性功能）
├── packages/
│   ├── shared/             # 共享代码、数据库模型、类型定义
│   ├── config-eslint/      # ESLint 配置
│   └── config-typescript/  # TypeScript 配置
├── ee/                     # 企业版功能
└── scripts/               # 构建和工具脚本
```

### 架构特点

- **功能模块化**：`web/src/features/` 按功能组织，每个功能模块包含组件、钩子和 tRPC 路由
- **多租户设计**：所有数据通过 `projectId` 隔离，确保数据安全
- **类型安全**：全栈 TypeScript，通过 tRPC 实现端到端类型安全
- **API 分层**：
  - tRPC：内部 API，供前端调用，类型安全
  - Public API：REST 端点，供 SDK 集成（30+ 个端点）
  - 支持批量数据摄入（最大 4.5MB）
- **完善的权限控制**：
  - 基于角色的访问控制（RBAC）
  - 四种角色：OWNER、ADMIN、MEMBER、VIEWER
  - 细粒度的权限范围（Scopes）控制
  - 完整的审计日志系统（17 种可审计资源类型）
- **安全性**：
  - API 密钥加密存储（SALT 加密）
  - 双哈希机制（安全哈希 + 快速哈希）
  - CSP 安全头配置
  - 项目级别数据隔离

---

## 快速开始

### 环境要求

- Node.js 20+ （推荐使用 Node.js 20 及以上版本）
- pnpm 9.5.0+
- Docker（用于本地数据库）

### 一键启动（推荐）

```bash
# 完整的开发环境设置
# 包括：安装依赖 + 启动数据库 + 数据库迁移 + 数据填充 + 启动开发服务器
pnpm run dx
```

### 分步启动

#### 1. 安装依赖

```bash
pnpm install
```

#### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.dev.example .env

# 编辑 .env 文件，配置必要的变量：
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - SALT
# - REDIS_HOST
# - REDIS_PORT
```

#### 3. 启动基础设施

```bash
# 启动 PostgreSQL 和 Redis
pnpm run infra:dev:up

# 停止基础设施
pnpm run infra:dev:down
```

#### 4. 数据库操作

```bash
# 运行数据库迁移
pnpm run db:migrate

# 填充示例数据
pnpm run db:seed:examples

# 重置数据库（开发环境）
pnpm --filter=shared run db:reset
```

#### 5. 启动开发服务器

```bash
# 启动 web + worker 开发服务器
pnpm run dev
```

访问 `http://localhost:3000` 即可使用。

---

## 常用命令

### 开发命令

```bash
# 完整开发设置（安装依赖、启动数据库、迁移、填充数据、启动服务）
pnpm run dx

# 强制重置数据库的完整设置
pnpm run dx-f

# 清理所有生成的文件（node_modules、构建文件等）
pnpm run nuke

# 启动开发服务器
pnpm run dev

# 构建所有包
pnpm run build

# 启动生产服务器
pnpm run start
```

### 数据库命令

```bash
# 生成 Prisma 客户端
pnpm run db:generate

# 运行数据库迁移
pnpm run db:migrate

# 应用 schema 变更（不创建迁移，仅开发环境）
pnpm --filter=shared run db:push

# 填充示例数据
pnpm run db:seed:examples

# 部署迁移到生产环境
pnpm --filter=shared run db:deploy
```

### 测试命令

```bash
# 运行所有测试
pnpm run test

# 运行特定包的测试
pnpm --filter=web test
pnpm --filter=worker test

# 监听模式运行测试
pnpm --filter=web test:watch

# 运行 E2E 测试
pnpm --filter=web test:e2e
```

### 代码质量

```bash
# 代码检查
pnpm run lint

# 自动修复代码问题
pnpm run lint:fix
```

---

## SDK 集成

Deeptrace 支持多种语言和框架的集成：

### 官方 SDK

| SDK | 语言 | 说明 |
|-----|------|------|
| [Python SDK](https://langfuse.com/docs/sdk/python) | Python | 支持装饰器模式，全异步 |
| [JavaScript/TypeScript SDK](https://langfuse.com/docs/sdk/typescript) | JS/TS | 完整的类型安全支持 |

### 框架集成

| 框架 | 支持语言 | 集成方式 |
|------|---------|---------|
| OpenAI | Python, JS/TS | Drop-in 替换 |
| LangChain | Python, JS/TS | Callback Handler |
| LlamaIndex | Python | Callback System |
| Haystack | Python | Content Tracing |
| LiteLLM | Python, JS/TS | 代理支持 100+ LLM |

### 其他集成

- Instructor（结构化输出）
- Mirascope（Python LLM 工具包）
- Vercel AI SDK
- Flowise（无代码构建器）
- Langflow（可视化构建）

---

## 开发工作流

### 功能开发流程

1. 从 `main` 分支创建功能分支
2. 启动开发环境：`pnpm run dx`
3. 进行代码开发
4. 运行测试：`pnpm run test`
5. 提交代码并创建 Pull Request

### 数据库变更流程

```bash
# 1. 修改 Prisma schema
vim packages/shared/prisma/schema.prisma

# 2. 创建迁移
pnpm --filter=shared run db:migrate -- --name migration_name

# 3. 测试迁移
pnpm --filter=shared run db:reset

# 4. 提交变更
git add packages/shared/prisma/
git commit -m "feat: add new database model"
```

---

## 部署

### Docker 本地部署（推荐）

**详细部署指南**: 📖 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

#### 快速开始

```bash
# 方法一：使用快速部署脚本（推荐）
./deploy.sh setup      # 初始化配置
./deploy.sh build      # 构建镜像
./deploy.sh start      # 启动服务

# 方法二：手动执行
cp .env.production.example .env.production
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml up -d
```

访问 http://localhost:3000 即可使用。

完整的构建、配置和故障排查说明，请查看 [Docker 部署指南](./DOCKER_DEPLOY.md)。

### 环境变量

生产环境必须配置的环境变量：

```bash
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/deeptrace

# 认证
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# 加密
SALT=your-salt-for-encryption

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_AUTH=redis-password

# 可选：关闭遥测
TELEMETRY_ENABLED=false
```

---

## 核心功能实现状态


| 功能模块 | 实现状态 | 说明 |
|---------|---------|------|
| **Traces 追踪** | ✅ 完整实现 | 包括完整的 CRUD、搜索、过滤和公开 API |
| **Observations** | ✅ 完整实现 | 支持 SPAN、EVENT、GENERATION 三种类型 |
| **Prompts 管理** | ✅ 完整实现 | 版本控制、标签系统、API v1/v2 |
| **数据集管理** | ✅ 完整实现 | Dataset、DatasetItem、DatasetRun 全部支持 |
| **测试运行** | ✅ 完整实现 | 批量测试、自动指标计算、表格视图对比 |
| **评分系统** | ✅ 完整实现 | 三种评分类型、API 提交、手动标注 UI |
| **项目管理** | ✅ 完整实现 | 多租户、成员管理、邀请系统 |
| **权限控制** | ✅ 完整实现 | RBAC、四种角色、细粒度权限 |
| **API 密钥** | ✅ 完整实现 | 加密存储、公钥/私钥体系 |
| **数据摄入** | ✅ 完整实现 | 批量摄入（单次最大4.5MB）、8 种核心事件类型、自动成本计算 |
| **数据导出** | ✅ 完整实现 | 异步导出、CSV 等格式 |
| **仪表板** | ✅ 完整实现 | 通用查询构建器、可视化分析 |
| **审计日志** | ✅ 完整实现 | 17 种资源类型、完整操作记录（含 before/after 状态） |
| **模型管理** | ✅ 完整实现 | 动态定价、模式匹配、Token 计算 |
| **Session 管理** | ✅ 完整实现 | 会话追踪、书签、公开分享 |


---

## 与原始 Langfuse 的区别

Deeptrace 基于 Langfuse v2.65.1 进行二次开发，专注于自托管场景，主要改进包括：

1. **自托管优化**：专为私有化部署优化，移除云服务依赖
2. **信创支持**：开源 Redis 和 PostgreSQL 数据库支持国产替代
3. **国际化支持**：完整中文本地化支持
4. **完整功能**：保留所有自托管场景下的核心功能
5. **UI 优化**：界面和用户体验的改进




