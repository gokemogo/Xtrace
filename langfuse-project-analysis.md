# Langfuse 项目完整分析文档

## 项目概述

**项目名称**: Langfuse LLM Observability Platform
**版本**: 2.65.1 (v2 架构，生产就绪)
**类型**: 开源 LLM 可观测性平台，用于调试、分析和优化 AI 应用
**架构**: 基于 Next.js 的全栈 Web 应用 + PostgreSQL + Redis 的单体架构

---

## 1. 技术栈

### 1.1 前端技术栈
- **框架**: Next.js 14 (Pages Router)
- **语言**: TypeScript 5.4.5
- **状态管理**: React Query (TanStack Query)
- **样式**: Tailwind CSS + shadcn/ui 组件库
- **表单**: React Hook Form + Zod 验证
- **图标**: Lucide React + Heroicons
- **代码编辑器**: CodeMirror
- **图表**: @tremor/react

### 1.2 后端技术栈
- **运行时**: Node.js 20
- **数据库**: PostgreSQL 16+ (Prisma ORM)
- **缓存**: Redis (会话存储 + 队列)
- **认证**: NextAuth.js
- **API**: tRPC (类型安全) + REST API
- **任务队列**: BullMQ (后台作业)
- **监控**: Sentry
- **邮件**: SMTP 支持

### 1.3 开发工具链
- **包管理**: pnpm 9.5.0 (monorepo)
- **构建**: Turborepo
- **代码质量**: ESLint + Prettier
- **测试**: Jest (单元) + Playwright (E2E)
- **环境**: Docker Compose (开发环境)

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web  │◄──►│   PostgreSQL   │    │     Redis      │
│   Application  │    │   Database      │    │   (Sessions/   │
│                │    │                │    │    Queues)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   tRPC API     │    │   Public API    │    │   Worker        │
│   (Internal)   │    │   (Ingestion)   │    │   (v3 Exp)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 架构分层

```
├── Web Layer (Next.js)
│   ├── Pages (页面路由)
│   ├── Features (功能模块)
│   ├── Components (共享组件)
│   └── API Routes (REST API)
├── API Layer
│   ├── tRPC (类型安全 API)
│   ├── Public API (SDK 集成)
│   └── Auth (认证中间件)
├── Business Logic
│   ├── EventProcessor (事件处理)
│   ├── Service Layer (业务服务)
│   └── Queue Processing (队列处理)
└── Data Layer
    ├── Prisma (ORM)
    ├── PostgreSQL (主数据库)
    └── Redis (缓存/队列)
```

---

## 3. 数据库模型设计

### 3.1 核心实体关系

```
User ──┐
        ├─ ProjectMembership ── Project ──┐
        │                           │
        │                           ├─ Trace ──┐
        │                           │         ├─ Observation
        │                           │         ├─ Score
        │                           │         └─ TraceSession
        │                           │
        │                           ├─ ApiKey
        │                           ├─ Dataset ──┐
        │                           │           ├─ DatasetItem
        │                           │           └─ DatasetRuns
        │                           │
        │                           ├─ Prompt (版本化)
        │                           ├─ Model (定价配置)
        │                           ├─ ScoreConfig
        │                           ├─ JobConfiguration (评估任务)
        │                           └─ AuditLog (审计日志)
        │
        └─ MembershipInvitation (项目邀请)
```

### 3.2 关键数据模型

#### Trace (追踪)
- **用途**: 表示一次完整的 LLM 交互或工作流
- **字段**: externalId, name, input, output, tags, userId, metadata
- **关联**: Observation, Score, TraceSession
- **特性**: 支持公开分享、书签、标签分类

#### Observation (观测)
- **类型**: SPAN, EVENT, GENERATION
- **用途**: 表示 LLM 调用的详细信息
- **字段**: model, input/output, token counts, timing, costs
- **特性**: 支持嵌套结构 (parentObservationId)
- **成本计算**: 自动计算 + 用户覆盖

#### Score (评分)
- **用途**: 对 Trace/Observation 的质量评估
- **来源**: ANNOTATION (手动), API (程序化), EVAL (自动评估)
- **数据类型**: NUMERIC, CATEGORICAL, BOOLEAN
- **特性**: 支持配置化评分标准

#### Project (项目)
- **多租户**: 所有数据按项目隔离
- **访问控制**: 基于角色的权限管理 (RBAC)
- **成员管理**: 邀请制 + 角色分配

---

## 4. 功能模块清单

### 4.1 核心功能

#### 数据摄取 (Ingestion)
**路径**: `web/src/pages/api/public/ingestion.ts`
**功能**:
- 批量事件处理 (4.5MB 限制)
- 多种事件类型: Trace, Observation, Score, SDK Log
- 实时数据处理 + 队列异步处理
- API Key 认证 + 权限控制
- 事件排序 + 去重处理

#### Trace 管理
**页面**: `/project/[projectId]/traces`
**功能**:
- Trace 列表查询 (过滤、排序、分页)
- 详细视图 (Trace 详情 + Observations)
- 公开分享链接
- 书签功能
- 标签管理
- 成本分析

#### 评分系统 (Scoring)
**功能**:
- 手动评分 (Annotation)
- API 评分 (程序化)
- 自动评估 (LLM-based Evaluation)
- 评分配置管理
- 多数据类型支持

#### 提示词管理 (Prompts)
**路径**: `/project/[projectId]/prompts`
**功能**:
- 版本化提示词管理
- Handlebars 模板支持
- 发布/标签系统
- 使用统计
- 实验性提示词 (实验版本)

### 4.2 高级功能

#### 数据集管理 (Datasets)
**路径**: `/project/[projectId]/datasets`
**功能**:
- 数据集创建/管理
- 数据项导入 (从 Trace/Observation)
- 实验运行 (Dataset Runs)
- 数据集版本控制
- 导出功能

#### 自动化评估 (Evaluations) - Cloud Only
**路径**: `/project/[projectId]/evals`
**功能**:
- LLM 评估模板
- 自动化评估作业配置
- 条件过滤 + 采样率
- 延迟执行 (队列)
- 评估日志查看

#### 仪表板 (Dashboard)
**功能**:
- 自定义 SQL 查询
- 图表可视化
- 实时数据展示
- 多维度分析

### 4.3 基础设施功能

#### 认证授权
**功能**:
- 多提供商 SSO (Google, GitHub, Okta, Auth0, Azure)
- 邮箱密码认证
- 企业 SSO 自定义
- API Key 管理
- 项目级 RBAC

#### 审计日志
**功能**:
- 所有关键操作记录
- 用户行为追踪
- 合规性支持
- 操作回溯

#### 监控告警
**功能**:
- Sentry 错误监控
- 性能指标收集
- 使用量统计
- 健康检查

---

## 5. API 架构

### 5.1 双 API 架构

#### tRPC API (内部)
**用途**: 前端内部调用
**特性**:
- 完全类型安全
- 自动文档生成
- 中间件支持 (认证、授权)
- 批量操作
- 复杂查询优化

**主要 Router**:
```typescript
// 核心数据
traces, observations, scores, scoreConfigs, sessions, generations
// 项目管理
projects, users, projectMembers, apiKeys
// 功能模块
datasets, prompts, models, dashboard, usageMetering
// 企业功能
evals, llmApiKey, posthogIntegration
// 工具
public, utilities
```

#### Public API (外部集成)
**用途**: SDK 集成
**路径**: `/public/api/*`
**特性**:
- RESTful 设计
- API Key 认证
- 批量数据摄取
- 兼容性保证
- 版本控制

**主要端点**:
```
POST /public/api/ingestion          # 数据摄取
GET  /public/api/traces/[id]        # Trace 查询
GET  /public/api/sessions/[id]      # Session 查询
POST /public/api/scores             # 创建评分
GET  /public/api/prompts            # Prompt 管理
GET  /public/api/datasets           # Dataset 管理
```

### 5.2 认证授权体系

#### 权限层级
```typescript
publicProcedure           // 公开访问
protectedProcedure        // 用户认证
protectedProjectProcedure // 项目成员权限
protectedGetTraceProcedure // Trace 访问控制
```

#### RBAC 作用域 (Scopes)
- `objects:bookmark` - 书签对象
- `objects:publish` - 公开对象
- `models:CUD` - 模型管理
- `scoreConfigs:read/CUD` - 评分配置
- `apiKeys:read/create/delete` - API Key 管理
- `members:read/delete` - 成员管理
- `project:update` - 项目设置
- `evalJob:read` - 评估作业 (Cloud Only)

---

## 6. 数据处理流程

### 6.1 数据摄取流程

```
SDK/REST API → Public/Ingestion API → EventProcessor → Database
       ↓
   验证/认证 → 批量处理 → 事件分类 → 数据存储
       ↓
   Worker Queue (异步处理) → 评估作业 → LLM 调用
```

### 6.2 事件处理架构

#### EventProcessor 基类
**功能**: 统一事件处理接口
**子类**:
- `TraceProcessor` - Trace 事件
- `ObservationProcessor` - Observation 事件
- `ScoreProcessor` - 评分事件
- `SdkLogProcessor` - SDK 日志

#### 处理流程
1. **事件验证**: Zod Schema 验证
2. **认证检查**: API Key 权限验证
3. **事件分类**: 根据类型分发到不同处理器
4. **数据转换**: 转换为数据库模型
5. **业务逻辑**: Token 计算、成本估算、模型匹配
6. **数据存储**: Prisma ORM 写入数据库
7. **队列触发**: 异步任务入队 (评估作业等)

### 6.3 成本计算机制

#### 多级成本策略
1. **用户提供的成本**: 优先使用用户提供的 cost 值
2. **模型配置成本**: 基于 Model 表的定价规则
3. **自动估算**: 基于 token 数量和默认单价

#### Token 计算
- **OpenAI 模型**: 使用 tiktoken 库
- **Anthropic 模型**: 使用官方 tokenizer
- **自定义模型**: 支持自定义 tokenizer 配置

---

## 7. 部署与运维

### 7.1 开发环境
**命令**: `pnpm run dx`
**包含**:
- 安装依赖
- 启动数据库 (PostgreSQL + Redis)
- 运行数据库迁移
- 种子数据初始化
- 启动开发服务器

### 7.2 生产环境
**架构特点**:
- 容器化部署
- 健康检查端点
- 指标收集 (Sentry)
- 备份策略
- 扩容支持

### 7.3 环境配置
**关键变量**:
```bash
DATABASE_URL              # PostgreSQL 连接
REDIS_URL                 # Redis 连接
NEXTAUTH_SECRET           # NextAuth 密钥
SALT                      # API Key 加密盐值
SMTP_CONNECTION_URL        # 邮件服务
LANGFUSE_WORKER_HOST     # Worker 服务 (Cloud)
```

---

## 8. 扩展特性

### 8.1 企业版特性 (EE)
- 单点登录 (SSO)
- 高级审计日志
- 数据导出
- 自定义品牌
- 优先支持

### 8.2 Cloud 版本特性
- Worker 服务 (v3 架构)
- 自动化评估
- 批量导出
- PostHog 集成
- 托管部署

### 8.3 集成能力
- **LLM Provider**: OpenAI, Anthropic, Azure 等
- **身份提供商**: Google, GitHub, Okta, Auth0
- **监控工具**: Sentry, PostHog
- **通知工具**: Slack 集成
- **数据分析**: CSV/JSON 导出

---

## 9. 性能与安全

### 9.1 性能优化
- **数据库索引**: 关键字段索引优化
- **查询优化**: 复杂查询使用原生 SQL
- **分页处理**: 大数据集分页加载
- **缓存策略**: Redis 缓存会话和频繁查询
- **批量处理**: 批量数据摄取和处理

### 9.2 安全措施
- **API Key 加密**: 使用 SALT 加密存储
- **输入验证**: 严格的 Zod Schema 验证
- **访问控制**: 项目级数据隔离
- **CSRF 保护**: NextAuth 内置保护
- **CSP 头**: 内容安全策略
- **SSRF 防护**: URL 验证防止内网访问

---

## 10. 开发指南

### 10.1 代码结构
```
langfuse/
├── web/                    # Next.js 主应用
│   ├── src/
│   │   ├── pages/         # 页面路由
│   │   ├── features/      # 功能模块
│   │   ├── server/        # 服务器端代码
│   │   └── components/    # 共享组件
├── worker/                # Worker 服务 (v3)
├── packages/
│   ├── shared/           # 共享代码和数据库
│   ├── config-eslint/    # ESLint 配置
│   └── config-typescript/# TypeScript 配置
├── ee/                  # 企业版特性
└── scripts/             # 构建脚本
```

### 10.2 开发流程
1. **分支管理**: 从 main 创建功能分支
2. **数据库变更**: 使用 Prisma 迁移
3. **代码提交**: 遵循 Conventional Commits
4. **测试运行**: 单元测试 + E2E 测试
5. **代码审查**: 提交 PR 进行审查

### 10.3 关键文件
- **数据库模型**: `packages/shared/prisma/schema.prisma`
- **API 定义**: `web/src/server/api/root.ts`
- **认证配置**: `web/src/server/auth.ts`
- **数据摄取**: `web/src/pages/api/public/ingestion.ts`
- **环境配置**: `.env.dev.example`

---

## 总结

Langfuse 是一个功能完整、架构清晰的企业级 LLM 可观测性平台。它采用现代化的技术栈，具备良好的扩展性和安全性。项目在 v2 架构中提供了完整的 Trace 管理、评分系统、提示词管理等核心功能，同时通过 v3 架构 (Worker 服务) 提供了更强大的异步处理和自动化评估能力。

系统的设计考虑了多租户、高可用、高性能等企业级需求，是一个经过生产验证的优质开源项目。