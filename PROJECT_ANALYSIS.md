# Deeptrace - LLM可观测性平台项目分析

## 项目概述

**Deeptrace** 是一个基于 [Langfuse v2.65.1](https://github.com/langfuse/langfuse) 二次开发的开源 LLM（大语言模型）可观测性平台。项目旨在帮助开发者更好地调试、分析和优化 AI 应用程序。

- **版本**: v2.65.1 (基于Langfuse v2稳定版架构)
- **架构**: 生产就绪的单体架构，正在向微服务架构演进
- **许可证**: MIT
- **状态**: 生产就绪，持续开发中

## 核心功能模块

### 🔍 数据追踪与可观测性
- **Trace追踪系统**: 完整的请求链路追踪，支持外部ID关联、元数据存储、标签分类
- **Observation观测系统**: 三种观测类型 - SPAN（跨度）、EVENT（事件）、GENERATION（生成）
- **实时监控**: 实时查看应用程序运行状态、性能指标和调用链
- **调试工具**: 深入分析复杂的日志、输入输出和模型参数

### 📊 数据分析与监控
- **多维度指标**: 追踪成本、延迟、Token用量、质量评分等关键指标
- **智能成本计算**: 基于模型定价自动计算输入/输出成本，支持自定义成本
- **可视化仪表盘**: 时间序列图表、用户行为分析、成本趋势分析
- **数据导出**: 支持批量导出、异步处理、多种格式导出

### 🧪 实验与评估系统
- **数据集管理**: 创建和管理测试数据集，支持从历史Trace创建数据集项
- **测试运行**: 在数据集上执行实验和基准测试，自动计算运行指标
- **A/B测试**: 对比不同模型、Prompt或参数配置的性能差异
- **评估系统**: 基于EvalTemplate执行自动评估，支持多种LLM提供商

### 🎯 核心特性
- **Prompt版本管理**: 版本化Prompt模板管理，支持标签、配置和部署
- **评分系统**: 数值型(NUMERIC)、分类型(CATEGORICAL)、布尔型(BOOLEAN)三种评分类型
- **多租户架构**: 项目级别的数据隔离，基于角色的访问控制(RBAC)
- **企业级安全**: API密钥AES-256-GCM加密、审计日志、会话管理、速率限制
- **异步任务处理**: BullMQ队列系统，支持评估、批量导出等后台任务

## 技术架构

### 整体架构设计
```
┌─────────────────────────────────────────────────┐
│                   Web Service                    │
│  Next.js 14 + Pages Router + tRPC + React 18    │
│  • 管理界面和配置                                │
│  • tRPC类型安全API                              │
│  • 实时数据展示                                 │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│                Shared Packages                   │
│  • Prisma ORM + 数据库模型                      │
│  • 类型定义和Zod Schema                         │
│  • 工具函数和错误处理                           │
│  • 过滤器转换和排序系统                         │
└─────────────────────────────────────────────────┘
                         │
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │   Redis     │  │   Sentry    │
│  主数据库   │  │  缓存/会话   │  │  错误监控   │
│  • 多租户隔离 │  │  队列系统   │  │  性能追踪   │
│  • 视图优化  │  │  BullMQ任务 │  │  用户分析   │
└─────────────┘  └─────────────┘  └─────────────┘
                         │
┌─────────────────────────────────────────────────┐
│                Worker Service                    │
│  Express.js + BullMQ + 后台处理                  │
│  • 评估任务执行                                 │
│  • 批量数据导出                                 │
│  • Token计数和成本计算                          │
└─────────────────────────────────────────────────┘
```

### 技术栈

#### 前端技术栈
- **框架**: Next.js 14 (Pages Router)
- **语言**: TypeScript 5.4.5
- **状态管理**: React Query (TanStack Query)
- **样式**: Tailwind CSS + shadcn/ui 组件库
- **API调用**: tRPC (类型安全的RPC)
- **图标**: Lucide React + Heroicons
- **代码编辑器**: CodeMirror
- **图表**: @tremor/react

#### 后端技术栈
- **运行时**: Node.js 20
- **数据库**: PostgreSQL 16+ (Prisma ORM + Kysely扩展)
- **缓存**: Redis (会话存储 + BullMQ队列)
- **认证**: NextAuth.js (支持多种OAuth提供商)
- **任务队列**: BullMQ (评估、导出、重复任务)
- **监控**: Sentry (错误追踪) + Posthog (用户分析) + OpenTelemetry
- **邮件**: SMTP 支持 (密码重置、通知)
- **加密**: AES-256-GCM (API密钥加密)
- **验证**: Zod (运行时类型验证)

#### 开发工具链
- **包管理**: pnpm 9.5.0 (monorepo)
- **构建**: Turborepo
- **代码质量**: ESLint + Prettier
- **测试**: Jest (单元) + Playwright (E2E)
- **环境**: Docker Compose (开发环境)

## 项目结构

### Monorepo 组织
```
deeptrace/
├── web/                    # 主Web应用 (Next.js 14 + tRPC)
├── worker/                 # 后台处理服务 (Express.js + BullMQ)
├── packages/shared/        # 共享工具、类型和数据库模型
├── ee/                     # 企业级功能
├── scripts/               # 构建和工具脚本
└── docker/                # 容器化配置
```

### 核心目录说明

#### Web应用 (`web/`)
```
web/src/
├── features/              # 功能模块 (功能切片架构)
│   ├── auth/             # 认证模块
│   ├── datasets/         # 数据集管理
│   ├── prompts/          # 提示词管理
│   ├── public-api/       # 公共API
│   ├── rbac/             # 基于角色的访问控制
│   └── ... (其他模块)
├── server/api/           # tRPC API服务器
│   ├── routers/          # API路由定义
│   └── trpc.ts           # tRPC配置
├── pages/                # Next.js页面
│   ├── api/              # REST API端点
│   └── project/          # 项目相关页面
└── components/           # 共享UI组件
```

#### Shared包 (`packages/shared/`) - 核心共享模块
```
packages/shared/src/
├── db.ts                 # 数据库连接 (Prisma + Kysely扩展)
├── index.ts              # 主导出文件 (类型、工具、错误类)
├── errors/               # 错误处理系统 (BaseError及其子类)
├── features/             # 功能相关类型
│   ├── ingestion/types.ts # 数据摄入类型定义
│   ├── evals/types.ts    # 评估系统类型
│   └── annotation/types.ts # 标注系统类型
├── interfaces/           # 接口定义 (过滤器、排序等)
├── tableDefinitions/     # 数据库视图和列定义
├── filterToPrisma.ts     # 过滤器转换到Prisma SQL
├── orderByToPrisma.ts    # 排序转换到Prisma SQL
├── tracesTable.ts        # Trace表列定义
├── observationsTable.ts  # Observation表列定义
├── server/               # 服务器端工具
│   ├── auth/            # 认证工具
│   ├── llm/             # LLM调用工具
│   └── otel/            # OpenTelemetry处理
├── utils/                # 工具函数
│   ├── zod.ts           # Zod Schema定义
│   ├── json.ts          # JSON处理工具
│   └── encryption.ts    # 加密工具函数
└── queues.ts            # BullMQ队列定义
```

#### Worker服务 (`worker/`) - 后台处理服务
```
worker/src/
├── features/             # 后台功能模块
│   ├── batchExport/      # 批量数据导出处理
│   ├── evaluation/       # 评估任务执行服务
│   ├── tokenisation/     # Token计数和成本计算
│   └── health/          # 健康检查和监控
├── queues/               # BullMQ队列定义和处理
│   ├── evalQueue.ts     # 评估任务队列
│   ├── batchExportQueue.ts # 批量导出队列
│   └── repeatQueue.ts   # 重复任务队列
├── api/                  # REST API端点 (健康检查、管理)
├── interfaces/           # 接口定义和类型
├── instrumentation.ts    # OpenTelemetry监控
├── logger.ts            # 结构化日志记录
├── redis.ts             # Redis连接管理
└── database.ts          # 数据库连接和工具
```

## 数据库设计

### 核心数据模型设计

#### 1. 多租户基础模型
```prisma
// 项目 - 多租户隔离的基础单位
model Project {
  id        String   @id @default(cuid())
  name      String
  // 关联所有项目数据
  traces    Trace[]
  observations Observation[]
  scores    Score[]
  apiKeys   ApiKey[]
  datasets  Dataset[]
  prompts   Prompt[]
  models    Model[]
  sessions  TraceSession[]
}

// 用户权限系统
model User {
  id                 String
  email              String? @unique
  password           String?  // 加密存储的密码
  admin              Boolean  @default(false)  // 超级管理员
  projectMemberships ProjectMembership[]  // 项目成员关系
  featureFlags       String[] @default([])  // 功能标志
}

// 项目成员关系 - 实现RBAC
model ProjectMembership {
  projectId String      @map("project_id")
  userId    String      @map("user_id")
  role      ProjectRole  // OWNER, ADMIN, MEMBER, VIEWER
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}
```

#### 2. 追踪体系核心模型
```prisma
// Trace - 追踪记录的核心实体
model Trace {
  id         String        @id @default(cuid())
  projectId  String        @map("project_id")
  externalId String?       @map("external_id")  // 外部系统ID
  timestamp  DateTime      @default(now())
  name       String?                           // 追踪名称
  userId     String?       @map("user_id")     // 用户标识
  metadata   Json?                            // 自定义元数据
  input      Json?                            // 输入数据
  output     Json?                            // 输出数据
  tags       String[]      @default([])       // 标签分类
  public     Boolean       @default(false)    // 是否公开
  bookmarked Boolean       @default(false)    // 是否收藏
  sessionId  String?       @map("session_id")  // 关联会话
  // 索引优化
  @@index([projectId, timestamp])
  @@index([tags(ops: ArrayOps)], type: Gin)
  @@index([sessionId])
}

// Observation - 观测记录，支持三种类型
model Observation {
  id                  String           @id @default(cuid())
  traceId             String?          @map("trace_id")
  projectId           String           @map("project_id")
  type                ObservationType  // SPAN, EVENT, GENERATION
  startTime           DateTime         @default(now()) @map("start_time")
  endTime             DateTime?        @map("end_time")
  name                String?                           // 观测名称
  metadata            Json?                            // 元数据
  parentObservationId String?          @map("parent_observation_id")  // 父子关系
  level               ObservationLevel @default(DEFAULT)  // 日志级别

  // GENERATION类型特有字段
  model               String?          // 模型名称
  modelParameters     Json?            @map("model_parameters")  // 模型参数
  promptTokens        Int     @default(0) @map("prompt_tokens")  // 输入token数
  completionTokens    Int     @default(0) @map("completion_tokens")  // 输出token数
  totalTokens         Int     @default(0) @map("total_tokens")  // 总token数
  unit                String?          // 计量单位

  // 成本计算
  calculatedInputCost  Decimal? @map("calculated_input_cost")  // 计算输入成本
  calculatedOutputCost Decimal? @map("calculated_output_cost")  // 计算输出成本
  calculatedTotalCost  Decimal? @map("calculated_total_cost")  // 计算总成本

  // 性能指标
  completionStartTime DateTime?     @map("completion_start_time")  // 完成开始时间
  timeToFirstToken    Float?       @map("time_to_first_token")  // 首token时间

  // 索引优化
  @@index([projectId, startTime, type])
  @@index([traceId, projectId])
  @@index([model])
}
```

#### 3. 评分系统模型
```prisma
// Score - 评分数据
model Score {
  id            String         @id @default(cuid())
  timestamp     DateTime       @default(now())
  projectId     String         @map("project_id")
  name          String                          // 评分名称
  value         Float?                          // 数值评分
  stringValue   String?        @map("string_value")  // 分类评分
  dataType      ScoreDataType  @default(NUMERIC) @map("data_type")  // 数据类型
  source        ScoreSource    // ANNOTATION, API, EVAL
  authorUserId  String?        @map("author_user_id")  // 评分作者
  comment       String?                          // 评论
  traceId       String         @map("trace_id")  // 关联Trace
  observationId String?        @map("observation_id")  // 关联Observation
  configId      String?        @map("config_id")  // 评分配置

  // 索引优化
  @@index([projectId, name])
  @@index([traceId], type: Hash)
  @@index([observationId], type: Hash)
}

// ScoreConfig - 评分配置
model ScoreConfig {
  id          String        @id @default(cuid())
  projectId   String        @map("project_id")
  name        String                          // 配置名称
  dataType    ScoreDataType @map("data_type")  // 数据类型
  minValue    Float?        @map("min_value")  // 最小值
  maxValue    Float?        @map("max_value")  // 最大值
  categories  Json?         @map("categories")  // 分类选项
  description String?                          // 描述
  isArchived  Boolean       @default(false) @map("is_archived")  // 是否归档
}
```

#### 4. 数据库视图
```prisma
// TraceView - 包含计算字段的Trace视图
view TraceView {
  id         String   @id @default(cuid())
  // 基础字段...
  duration   Float?   @map("duration")  // 计算字段：持续时间
}

// ObservationView - 合并Observation和Model的视图
view ObservationView {
  id                  String           @id @default(cuid())
  // Observation字段...
  modelId             String?          @map("model_id")  // 模型ID
  inputPrice          Decimal?         @map("input_price")  // 输入价格
  outputPrice         Decimal?         @map("output_price")  // 输出价格
  totalPrice          Decimal?         @map("total_price")  // 总价格
  // 计算字段
  latency             Float?           @map("latency")  // 延迟
  timeToFirstToken    Float?           @map("time_to_first_token")  // 首token时间
}
```

### 多租户架构设计特点

#### 1. 数据隔离策略
- **项目级隔离**: 所有核心表都有 `project_id` 字段，所有查询自动添加项目过滤条件
- **数据库视图**: 使用数据库视图提供计算字段和跨表查询
- **索引优化**: 为 `project_id` 和相关查询字段创建复合索引

#### 2. 权限控制系统
- **RBAC实现**: 通过 `ProjectMembership` 表实现基于角色的访问控制
- **四级角色**: OWNER（完全控制）、ADMIN（管理设置）、MEMBER（读写访问）、VIEWER（只读访问）
- **权限继承**: 管理员自动拥有所有项目的查看权限
- **会话缓存**: 用户项目权限预加载到会话中，减少数据库查询

#### 3. API密钥安全
- **加密存储**: 使用AES-256-GCM加密存储API密钥，密钥通过SALT环境变量派生
- **快速验证**: 支持快速哈希验证优化性能
- **密钥管理**: 支持密钥过期、最后使用时间记录、密钥轮换
- **项目绑定**: API密钥与特定项目绑定，实现细粒度访问控制

#### 4. 审计日志系统
- **完整审计**: 记录所有关键操作（创建、更新、删除）
- **变更追踪**: 记录数据变更前后的状态
- **用户关联**: 所有操作都与具体用户关联
- **时间戳**: 精确的操作时间记录

## API架构设计

### 三层API架构设计

#### 1. tRPC内部API - 类型安全的管理接口
**路径**: `/api/trpc/*`
**认证**: NextAuth.js会话认证
**特点**:
- **端到端类型安全**: 自动生成TypeScript类型定义
- **模块化路由**: 按功能模块组织路由 (`web/src/server/api/routers/`)
- **中间件系统**: 支持认证、授权、错误处理、监控等中间件
- **批量操作**: 支持批量查询和操作
- **分页支持**: 标准化的分页参数和响应格式

**核心中间件**:
```typescript
// 公开过程 - 无需认证
export const publicProcedure = withSentryProcedure;

// 保护过程 - 需要用户登录
export const protectedProcedure = withSentryProcedure.use(enforceUserIsAuthed);

// 项目保护过程 - 需要项目成员身份
export const protectedProjectProcedure = withSentryProcedure.use(
  enforceUserIsAuthedAndProjectMember
);

// Trace访问过程 - 支持公开Trace访问
export const protectedGetTraceProcedure = withSentryProcedure.use(enforceTraceAccess);
```

#### 2. REST公共API - 高性能SDK集成接口
**路径**: `/api/public/ingestion` 和 `/api/public/*`
**认证**: API密钥认证 (publicKey + hashedSecretKey)
**特点**:
- **高性能设计**: 支持4.5MB大请求体，批量事件处理
- **向后兼容**: 支持新旧版本API，平滑升级
- **事件驱动**: 基于EventProcessor架构处理不同类型事件
- **异步处理**: 支持后台任务队列处理
- **验证严格**: 使用Zod进行严格的请求验证

**数据摄入流程**:
```
SDK客户端 → POST /api/public/ingestion
          ↓ 验证API密钥和项目权限
          ↓ 解析和验证批量事件
          ↓ EventProcessor处理不同类型事件
          ├── TraceProcessor (Trace创建/更新)
          ├── ObservationProcessor (SPAN/EVENT/GENERATION)
          ├── ScoreProcessor (评分数据)
          └── SdkLogProcessor (SDK日志)
          ↓ 数据库持久化 (Prisma ORM)
          ↓ 触发后台任务 (BullMQ队列)
```

#### 3. 认证和授权系统

**认证提供者支持**:
- **用户名密码**: 支持Turnstile验证码，域名单限制
- **OAuth提供商**: Google、GitHub、Okta、Auth0、Cognito、Azure AD
- **企业SSO**: 自定义SSO配置，域强制SSO
- **API密钥**: 项目级别的程序化访问

**授权中间件实现**:
```typescript
// 项目成员验证中间件
const enforceUserIsAuthedAndProjectMember = t.middleware(
  ({ ctx, rawInput, next }) => {
    // 1. 验证用户登录状态
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // 2. 验证项目ID输入
    const result = inputProjectSchema.safeParse(rawInput);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST" });

    // 3. 验证项目成员身份
    const projectId = result.data.projectId;
    const sessionProject = ctx.session.user.projects.find(
      ({ id }) => id === projectId,
    );

    // 4. 检查管理员权限或项目成员身份
    if (!sessionProject && !isProjectMemberOrAdmin(ctx.session.user, projectId))
      throw new TRPCError({ code: "UNAUTHORIZED" });

    // 5. 增强上下文，传递项目信息
    return next({
      ctx: {
        session: {
          ...ctx.session,
          user: ctx.session.user,
          projectRole: ctx.session.user.admin === true ? "ADMIN" : sessionProject!.role,
          projectId: projectId,
        },
      },
    });
  },
);
```

#### 4. 错误处理系统

**错误类层次结构**:
```typescript
BaseError (基础错误类)
├── ApiError (API错误基类)
├── UnauthorizedError (401 - 未授权)
├── ForbiddenError (403 - 禁止访问)
├── NotFoundError (404 - 资源未找到)
├── InvalidRequestError (400 - 无效请求)
├── MethodNotAllowedError (405 - 方法不允许)
└── InternalServerError (500 - 内部服务器错误)
```

**统一错误处理**:
- **开发环境**: 详细错误信息和堆栈跟踪
- **生产环境**: 安全的错误信息，防止信息泄露
- **监控集成**: Sentry错误捕获和性能监控
- **标准化响应**: 统一的错误响应格式

## 核心业务流程分析

### 1. 数据摄入流程 - SDK到数据库的完整处理

```
SDK客户端 (Python/JS/其他)
    ↓ POST /api/public/ingestion (批量事件)
公共API路由 (`web/src/pages/api/public/ingestion.ts`)
    ↓ 1. CORS中间件处理
    ↓ 2. 验证API密钥 (`verifyAuthHeaderAndReturnScope`)
    ↓ 3. 解析和验证批量请求体 (Zod Schema验证)
    ↓ 4. 事件预处理和清理
EventProcessor架构处理 (`web/src/server/api/services/EventProcessor.ts`)
    ├── TraceProcessor: 处理Trace创建/更新事件
    │   • 支持外部ID关联
    │   • 元数据和标签处理
    │   • 会话关联管理
    ├── ObservationProcessor: 处理三种观测类型
    │   • SPAN: 时间跨度记录
    │   • EVENT: 离散事件记录
    │   • GENERATION: LLM生成记录
    │   • 模型匹配和成本计算
    ├── ScoreProcessor: 处理评分数据
    │   • 三种数据类型处理
    │   • 评分配置验证
    │   • 来源追踪
    └── SdkLogProcessor: 处理SDK日志
数据库持久化 (通过Prisma ORM)
    ↓ 1. 事务性操作确保数据一致性
    ↓ 2. 数据库视图更新计算字段
    ↓ 3. 索引优化查询性能
后台任务触发 (BullMQ队列)
    ├── 评估任务: 自动执行模型评估
    ├── 批量导出: 异步数据导出处理
    └── 重复任务: 定期清理和维护
```

### 2. 管理界面流程 - 用户交互到数据展示

```
React组件 (Next.js页面)
    ↓ 1. 使用React Query管理服务器状态
    ↓ 2. 调用tRPC过程 (类型安全的API调用)
    ↓ 3. URL状态管理 (use-query-params)
tRPC客户端 (`web/src/utils/api.ts`)
    ↓ 1. 自动类型推断和代码补全
    ↓ 2. 请求/响应序列化 (superjson)
    ↓ 3. 错误处理和重试逻辑
tRPC服务器 (`web/src/pages/api/trpc/[trpc].ts`)
    ↓ 1. 请求路由到对应处理器
    ↓ 2. 中间件链执行 (认证、授权、监控)
    ↓ 3. 上下文注入 (数据库连接、用户会话)
tRPC路由器 (`web/src/server/api/routers/`)
    ↓ 1. 业务逻辑执行
    ↓ 2. 数据库查询 (Prisma + 原始SQL优化)
    ↓ 3. 数据转换和格式化
数据库操作 (Prisma ORM + Kysely扩展)
    ↓ 1. 查询构建和优化
    ↓ 2. 连接池管理
    ↓ 3. 事务处理
返回结果处理
    ↓ 1. 数据序列化
    ↓ 2. 分页和排序处理
    ↓ 3. 错误格式标准化
前端渲染和状态更新
    ↓ 1. React组件重新渲染
    ↓ 2. 缓存更新 (React Query)
    ↓ 3. UI状态同步
```

### 3. 后台任务处理流程 - 异步作业系统

```
Web应用触发后台任务
    ↓ 1. 评估任务触发 (Trace创建/更新时)
    ↓ 2. 批量导出请求
    ↓ 3. 定期维护任务
Redis队列系统 (BullMQ)
    ↓ • EvaluationExecution队列: 评估任务执行
    ↓ • TraceUpsert队列: Trace更新触发评估
    ↓ • BatchExport队列: 批量数据导出
    ↓ • RepeatQueue队列: 重复性任务
Worker服务监听和处理 (`worker/src/queues/`)
    ↓ 1. 队列连接和配置
    ↓ 2. 并发控制和速率限制
    ↓ 3. 错误处理和重试策略
任务执行逻辑
    ├── 评估任务执行 (`worker/src/features/evaluation/eval-service.ts`)
    │   • 加载EvalTemplate配置
    │   • 变量替换和LLM调用
    │   • 输出模式验证和评分
    │   • 结果存储和状态更新
    ├── 批量导出处理 (`worker/src/features/batchExport/`)
    │   • 数据查询和过滤
    │   • 格式转换 (CSV/JSON)
    │   • 文件存储和URL生成
    │   • 过期管理和清理
    └── Token计数和成本计算
        • 模型匹配和定价查询
        • Token计数 (OpenAI/Claude)
        • 成本计算和更新
任务状态管理
    ↓ 1. 任务状态跟踪 (pending/running/completed/error)
    ↓ 2. 进度更新和日志记录
    ↓ 3. 结果存储和关联
数据库更新和通知
    ↓ 1. 异步更新相关记录
    ↓ 2. 发送通知 (邮件/Webhook)
    ↓ 3. 缓存失效和刷新
```

### 4. 认证和授权流程

```
用户登录请求
    ↓ 1. 认证提供者选择 (OAuth/用户名密码/SSO)
    ↓ 2. 凭证验证和用户查找
    ↓ 3. 会话创建和Cookie设置
会话管理和权限加载
    ↓ 1. 用户基本信息加载
    ↓ 2. 项目成员关系查询
    ↓ 3. 功能标志和权限预加载
API访问授权
    ↓ 1. 中间件验证会话有效性
    ↓ 2. 项目权限检查 (RBAC)
    ↓ 3. 资源级别访问控制
审计日志记录
    ↓ 1. 操作类型识别
    ↓ 2. 变更前后状态记录
    ↓ 3. 用户上下文关联
```

### 5. 监控和错误处理流程

```
错误发生点
    ↓ 1. 业务逻辑错误 (BaseError子类)
    ↓ 2. 数据库异常 (Prisma异常)
    ↓ 3. 网络和系统错误
错误捕获和处理
    ↓ 1. 错误类实例化 (包含HTTP状态码和描述)
    ↓ 2. 调用栈记录 (Error.captureStackTrace)
    ↓ 3. 错误分类 (操作性/非操作性)
错误响应生成
    ↓ 1. 开发环境: 详细错误信息和堆栈
    ↓ 2. 生产环境: 安全错误信息
    ↓ 3. 标准化错误格式
监控系统集成
    ↓ 1. Sentry错误捕获和性能监控
    ↓ 2. 自定义指标收集 (摄入事件计数等)
    ↓ 3. 用户行为分析 (Posthog)
日志记录和分析
    ↓ 1. 结构化日志记录
    ↓ 2. 日志聚合和搜索
    ↓ 3. 告警和通知
```

## 技术实现细节

### 1. 类型安全和验证系统

#### Zod Schema验证
```typescript
// 严格的运行时类型验证
export const ingestionEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(eventTypes.TRACE_CREATE),
    body: traceCreateEvent,
  }),
  z.object({
    type: z.literal(eventTypes.SPAN_CREATE),
    body: spanCreateEvent,
  }),
  // ... 其他事件类型
]);

// 递归JSON Schema定义
export const jsonSchema: z.ZodType<JsonNested> = z.lazy(() =>
  z.union([
    nestedLiteralSchema,
    z.array(jsonSchema),
    z.record(jsonSchema),
  ])
);
```

#### 过滤器转换系统
- **数据类型支持**: datetime, string, number, stringOptions, arrayOptions等
- **操作符映射**: "contains" → "ILIKE", "any of" → "IN"等
- **SQL注入防护**: 使用Prisma模板字符串和参数化查询
- **列名验证**: 验证列名是否存在于表定义中

### 2. 数据库优化策略

#### 索引设计
- **复合索引**: `[projectId, timestamp]` 用于时间范围查询
- **GIN索引**: 数组字段 (`tags`) 支持快速包含查询
- **哈希索引**: 等值查询优化 (`traceId`, `observationId`)
- **部分索引**: 针对常用查询模式优化

#### 查询优化
- **数据库视图**: 预计算字段减少运行时计算
- **原始SQL优化**: 复杂查询使用Kysely构建优化SQL
- **连接池管理**: Prisma连接池配置优化
- **查询缓存**: Redis缓存常用查询结果

### 3. 错误处理架构

#### 错误类设计
```typescript
export class BaseError extends Error {
  public readonly name: string;
  public readonly httpCode: number;
  public readonly isOperational: boolean;

  constructor(name: string, httpCode: number, description: string, isOperational: boolean) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.httpCode = httpCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}
```

#### 错误处理中间件
- **开发环境**: 详细错误信息和堆栈跟踪
- **生产环境**: 安全错误信息，防止敏感信息泄露
- **监控集成**: Sentry自动错误捕获和上下文关联
- **标准化响应**: 统一的错误响应格式

### 4. 安全实现

#### 加密系统
- **API密钥加密**: AES-256-GCM加密，使用SALT环境变量
- **密码哈希**: bcryptjs密码哈希存储
- **传输安全**: HTTPS强制，CSP安全头配置
- **输入验证**: Zod严格验证所有用户输入

#### 访问控制
- **RBAC实现**: 四级角色权限系统
- **项目隔离**: 所有查询自动添加项目过滤
- **会话管理**: JWT令牌，支持过期和刷新
- **速率限制**: API端点请求频率限制

### 5. 监控和可观测性

#### 监控集成
- **Sentry**: 错误追踪、性能监控、用户上下文
- **Posthog**: 用户行为分析、功能使用统计
- **OpenTelemetry**: 分布式追踪、指标收集
- **健康检查**: 服务状态监控和告警

#### 日志系统
- **结构化日志**: JSON格式日志，便于聚合和分析
- **日志级别**: DEBUG, INFO, WARN, ERROR分级
- **上下文关联**: 请求ID、用户ID、项目ID关联
- **日志聚合**: 集中日志存储和搜索

## 部署方案

### Docker Compose部署
```yaml
services:
  deeptrace-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dev
      - POSTGRES_USER=system
      - POSTGRES_PASSWORD=Deeptrace@2025
    ports:
      - "54321:5432"

  deeptrace-redis:
    image: redis:7.2-alpine
    ports:
      - "6397:6379"
    command: redis-server --requirepass Deeptrace@2025

  deeptrace-app:
    image: compass/deeptrace:1.1.0-arm64
    ports:
      - "5000:5000"  # Web前端
      - "5001:5001"  # Worker后端
    environment:
      - DATABASE_URL=postgresql://system:Deeptrace@2025@deeptrace-db:5432/dev
      - REDIS_HOST=deeptrace-redis
      - NEXTAUTH_SECRET=secret
      - SALT=salt
```

### 关键环境变量
```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@host:port/db
DIRECT_URL=postgresql://user:password@host:port/db

# 认证配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=加密密钥

# 安全配置
SALT=API密钥加密盐值
ENCRYPTION_KEY=加密密钥

# Redis配置
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_AUTH=redis密码

# Worker配置
LANGFUSE_WORKER_PASSWORD=worker基本认证密码
```

## 开发指南

### 快速开始
```bash
# 1. 克隆项目
git clone <repository-url>
cd deeptrace

# 2. 安装依赖
pnpm install

# 3. 启动基础设施
pnpm run infra:dev:up

# 4. 配置环境变量
cp .env.dev.example .env
# 编辑.env文件，配置必要的环境变量

# 5. 初始化数据库
pnpm run db:migrate
pnpm run db:seed:examples

# 6. 启动开发服务器
pnpm run dev
```

### 常用命令
```bash
# 开发环境
pnpm run dx              # 完整开发设置 (安装依赖、启动db、种子数据、运行dev)
pnpm run dx-f            # 强制重置数据库的完整开发设置
pnpm run nuke            # 清理所有构建文件和node_modules

# 数据库操作
pnpm run db:migrate      # 运行数据库迁移
pnpm run db:push         # 直接推送schema变更 (仅开发)
pnpm run db:reset        # 重置数据库并重新应用迁移
pnpm run db:seed:examples # 种子示例数据

# 构建和测试
pnpm run build           # 构建所有包
pnpm run test            # 运行所有测试
pnpm run lint            # 代码检查
pnpm run lint:fix        # 自动修复代码问题
```

### 代码规范
- **TypeScript**: 严格模式，类型安全优先
- **提交信息**: 遵循Conventional Commits规范
- **代码风格**: ESLint + Prettier统一格式化
- **测试覆盖**: 单元测试 + E2E测试结合

## 性能优化和扩展性

### 性能优化策略

#### 1. 数据库性能优化
- **索引策略**: 为常用查询模式创建复合索引和部分索引
- **查询优化**: 使用EXPLAIN分析查询计划，优化慢查询
- **连接池**: Prisma连接池配置优化，避免连接泄露
- **批量操作**: 支持批量插入和更新，减少数据库往返

#### 2. 缓存优化
- **Redis缓存**: 会话存储、查询结果缓存、队列系统
- **内存缓存**: Node.js内存缓存常用配置和数据
- **CDN集成**: 静态资源通过CDN分发，减少服务器负载
- **浏览器缓存**: HTTP缓存头优化，减少重复请求

#### 3. 前端性能优化
- **代码分割**: 动态导入和路由级代码分割
- **图片优化**: 自动图片优化和WebP格式支持
- **资源预加载**: 关键资源预加载，提升首屏速度
- **懒加载**: 图片、组件、数据懒加载优化

#### 4. API性能优化
- **请求合并**: 支持批量API请求，减少HTTP开销
- **响应压缩**: Gzip/Brotli响应压缩，减少传输大小
- **连接复用**: HTTP/2连接复用，减少连接建立开销
- **超时控制**: 合理的请求超时和重试策略

### 水平扩展策略

#### 1. 数据库扩展
- **读写分离**: 主从复制，读写操作分离
- **分库分表**: 按项目ID进行数据库分片
- **连接池扩展**: 支持多数据库连接池
- **查询路由**: 智能查询路由到合适的数据库节点

#### 2. 应用服务器扩展
- **无状态设计**: 应用服务器无状态，便于水平扩展
- **负载均衡**: 支持多实例部署和负载均衡
- **会话外部化**: 会话存储到Redis，支持多实例共享
- **健康检查**: 自动健康检查和故障转移

#### 3. 队列系统扩展
- **队列分区**: 按项目或类型进行队列分区
- **Worker扩展**: 支持多Worker实例并行处理
- **优先级队列**: 不同优先级任务处理
- **死信队列**: 失败任务处理和重试

#### 4. 监控和运维扩展
- **分布式追踪**: OpenTelemetry分布式追踪支持
- **日志聚合**: 集中式日志收集和分析
- **指标收集**: Prometheus指标收集和告警
- **自动扩缩容**: 基于负载的自动扩缩容

### 架构演进路线

#### v2架构 (当前生产版本)
- **单体架构**: Next.js应用处理所有请求
- **数据库**: PostgreSQL主数据库 + Redis缓存
- **部署**: 单实例或有限多实例部署
- **特点**: 简单可靠，适合中小规模部署

#### v3架构 (演进方向)
- **微服务架构**: Web服务 + Worker服务分离
- **分析数据库**: 引入ClickHouse处理分析型查询
- **实时处理**: WebSocket支持实时数据更新
- **扩展性**: 更好的水平扩展和容错能力

#### 未来扩展计划
- **数据湖集成**: 支持数据湖存储和查询
- **AI功能增强**: 内置AI分析和建议功能
- **插件系统**: 支持第三方插件和扩展
- **多云支持**: 支持多云部署和混合云架构

### 容量规划建议

#### 小规模部署 (≤ 100万事件/月)
- **服务器**: 2-4 CPU, 4-8GB内存
- **数据库**: PostgreSQL 50GB存储
- **缓存**: Redis 2GB内存
- **并发**: 支持10-50并发用户

#### 中规模部署 (100万-1000万事件/月)
- **服务器**: 4-8 CPU, 8-16GB内存
- **数据库**: PostgreSQL 200GB存储，读写分离
- **缓存**: Redis 8GB内存，集群模式
- **并发**: 支持50-200并发用户

#### 大规模部署 (> 1000万事件/月)
- **服务器**: 8+ CPU, 16+ GB内存，多实例
- **数据库**: PostgreSQL分库分表，专用分析数据库
- **缓存**: Redis集群，多节点部署
- **并发**: 支持200+并发用户，自动扩缩容

## 安全特性

### 数据安全
- API密钥加密存储 (使用SALT环境变量)
- HTTPS强制传输加密
- CSP安全头配置
- 敏感数据脱敏处理

### 访问控制
- 多级认证中间件
- 基于角色的权限控制 (RBAC)
- 会话管理和过期机制
- API速率限制

### 审计日志
- 完整的操作审计记录
- 用户行为追踪
- 数据变更历史
- 安全事件监控

## 监控和运维

### 监控集成
- **Sentry**: 错误追踪和性能监控
- **Posthog**: 用户行为分析
- **健康检查**: 服务状态监控
- **自定义遥测**: 业务指标收集

### 运维工具
- 数据库迁移管理 (Prisma)
- 容器化部署 (Docker)
- 环境变量配置管理
- 日志聚合和分析

## 项目技术优势

### 架构设计优势

#### 1. 类型安全全栈开发
- **端到端类型安全**: TypeScript + tRPC确保从数据库到前端的完整类型安全
- **自动类型生成**: Prisma自动生成数据库类型，tRPC自动生成API类型
- **运行时验证**: Zod Schema提供严格的运行时数据验证
- **编译时检查**: TypeScript严格模式防止常见编程错误

#### 2. 模块化架构设计
- **功能切片架构**: 每个功能模块独立，高内聚低耦合
- **Monorepo管理**: pnpm workspace + Turborepo优化构建和依赖管理
- **共享代码库**: 统一的类型定义、工具函数、错误处理
- **插件化扩展**: 易于添加新功能模块和集成第三方服务

#### 3. 性能优化策略
- **数据库优化**: 智能索引设计、查询优化、视图预计算
- **缓存策略**: Redis多级缓存、连接池优化、查询结果缓存
- **异步处理**: BullMQ队列系统、后台任务处理、批量操作
- **前端优化**: React Query缓存、代码分割、懒加载

#### 4. 安全性和可靠性
- **企业级安全**: AES-256-GCM加密、RBAC权限控制、审计日志
- **错误恢复**: 完善的错误处理、重试机制、事务回滚
- **监控告警**: Sentry错误监控、性能追踪、健康检查
- **数据一致性**: 数据库事务、乐观锁、数据验证

### 功能实现优势

#### 1. 完整的LLM可观测性
- **多维度追踪**: Trace、Observation、Score完整追踪体系
- **成本计算**: 自动Token计数、模型匹配、成本计算
- **性能分析**: 延迟监控、首token时间、错误率统计
- **质量评估**: 评分系统、A/B测试、数据集评估

#### 2. 企业级多租户支持
- **数据隔离**: 项目级别的完整数据隔离
- **权限管理**: 四级RBAC角色系统，细粒度权限控制
- **审计追踪**: 完整的操作审计日志，变更历史记录
- **扩展性**: 支持水平扩展，大规模部署

#### 3. 开发者友好设计
- **完善的文档**: 详细的API文档、部署指南、开发文档
- **开发工具**: 完整的开发环境、测试套件、调试工具
- **社区支持**: 基于Langfuse活跃社区，丰富的生态集成
- **标准化**: 遵循行业最佳实践，代码规范统一

#### 4. 现代化技术栈
- **前端技术**: Next.js 14、React 18、Tailwind CSS、shadcn/ui
- **后端技术**: Node.js 20、Prisma、PostgreSQL、Redis、BullMQ
- **开发工具**: TypeScript、ESLint、Prettier、Jest、Playwright
- **部署运维**: Docker、Docker Compose、健康检查、监控告警

### 技术创新亮点

#### 1. 智能模型匹配系统
- **正则匹配**: 支持正则表达式模型名称匹配
- **定价关联**: 自动关联模型定价和Token计数
- **单位转换**: 支持多种计量单位（TOKENS、CHARACTERS等）
- **成本计算**: 自动计算输入/输出/总成本

#### 2. 事件驱动架构
- **EventProcessor**: 统一的事件处理接口，支持多种事件类型
- **队列系统**: BullMQ实现可靠的异步任务处理
- **实时处理**: 支持实时数据摄入和处理
- **批量优化**: 批量事件处理优化性能

#### 3. 高级查询系统
- **过滤器转换**: 灵活的前端过滤器到SQL查询转换
- **排序系统**: 支持多字段排序和NULL值处理
- **分页优化**: 高效的分页查询和计数
- **视图预计算**: 数据库视图优化复杂查询

#### 4. 国际化支持
- **多语言界面**: 支持中英文界面切换
- **本地化格式**: 日期、时间、数字格式本地化
- **翻译系统**: 完整的翻译键值系统
- **RTL支持**: 支持从右到左语言布局

## 开发贡献指南

### 开发环境设置

#### 1. 环境准备
```bash
# 1. 克隆项目
git clone <repository-url>
cd deeptrace

# 2. 安装依赖
pnpm install

# 3. 启动开发基础设施
pnpm run infra:dev:up

# 4. 配置环境变量
cp .env.dev.example .env
# 编辑.env文件，配置必要的环境变量

# 5. 初始化数据库
pnpm run db:migrate
pnpm run db:seed:examples

# 6. 启动开发服务器
pnpm run dev
```

#### 2. 开发工具配置
- **代码编辑器**: VS Code推荐配置在 `.vscode/` 目录
- **代码格式化**: Prettier自动格式化，ESLint代码检查
- **Git钩子**: Husky配置pre-commit和pre-push钩子
- **调试配置**: Node.js调试配置，浏览器调试工具

### 代码规范和约定

#### 1. 代码结构约定
- **新功能模块**: 放在 `web/src/features/` 对应目录，遵循功能切片架构
- **共享代码**: 类型定义、工具函数放在 `packages/shared/`
- **后台任务**: Worker服务功能放在 `worker/src/features/`
- **UI组件**: 共享UI组件放在 `web/src/components/`
- **API路由**: tRPC路由放在 `web/src/server/api/routers/`

#### 2. 命名约定
- **文件命名**: 使用kebab-case (例如: `event-processor.ts`)
- **组件命名**: 使用PascalCase (例如: `TracePreview.tsx`)
- **变量命名**: 使用camelCase (例如: `userSession`)
- **常量命名**: 使用UPPER_SNAKE_CASE (例如: `API_TIMEOUT`)
- **类型命名**: 使用PascalCase (例如: `ApiAccessScope`)

#### 3. 代码质量要求
- **类型安全**: 所有代码必须通过TypeScript严格模式检查
- **测试覆盖**: 新功能必须包含单元测试和集成测试
- **错误处理**: 使用BaseError子类处理所有错误
- **日志记录**: 关键操作必须包含适当的日志记录
- **性能考虑**: 避免性能瓶颈，优化数据库查询

### 开发工作流程

#### 1. 功能开发流程
```bash
# 1. 创建功能分支
git checkout -b feat/your-feature-name

# 2. 开发新功能
# - 添加必要的类型定义 (packages/shared/src/features/)
# - 实现后端逻辑 (web/src/server/api/routers/)
# - 实现前端界面 (web/src/features/)
# - 添加测试用例 (web/src/__tests__/)

# 3. 运行测试
pnpm run test

# 4. 代码检查和格式化
pnpm run lint
pnpm run lint:fix

# 5. 提交代码
git add .
git commit -m "feat: description of your feature"

# 6. 推送分支并创建PR
git push origin feat/your-feature-name
```

#### 2. 数据库变更流程
```bash
# 1. 修改Prisma Schema
# 编辑 packages/shared/prisma/schema.prisma

# 2. 生成迁移文件
pnpm --filter=shared run db:migrate -- --name migration_name

# 3. 应用迁移
pnpm run db:migrate

# 4. 生成Prisma客户端
pnpm run db:generate
```

#### 3. API开发规范
- **tRPC过程**: 使用适当的中间件 (public/protected/protectedProject)
- **输入验证**: 使用Zod Schema进行严格的输入验证
- **错误处理**: 抛出适当的BaseError子类错误
- **响应格式**: 遵循统一的响应格式规范
- **文档注释**: 添加JSDoc注释说明API用途和参数

### 测试策略

#### 1. 单元测试
- **位置**: `web/src/__tests__/` 目录
- **工具**: Jest测试框架
- **范围**: 工具函数、业务逻辑、组件逻辑
- **要求**: 关键路径必须达到80%以上测试覆盖率

#### 2. 集成测试
- **位置**: `web/src/__tests__/` 目录，以 `.servertest.ts` 结尾
- **工具**: Jest + 真实数据库
- **范围**: API端点、数据库操作、完整业务流程
- **要求**: 测试真实的数据流和交互

#### 3. E2E测试
- **位置**: `web/` 目录下的Playwright测试
- **工具**: Playwright测试框架
- **范围**: 用户界面、完整用户流程
- **要求**: 关键用户流程必须包含E2E测试

#### 4. 测试工具函数
```typescript
// 测试数据库清理
import { pruneDatabase } from "@/src/__tests__/test-utils";

// API调用工具
import { makeAPICall } from "@/src/__tests__/test-utils";

// 测试数据工厂
import { createTestUser, createTestProject } from "@/src/__tests__/test-utils";
```

### 代码审查要点

#### 1. 架构审查
- 是否符合功能切片架构原则
- 是否遵循依赖注入和单一职责原则
- 是否考虑了扩展性和维护性
- 是否遵循了安全最佳实践

#### 2. 代码质量审查
- TypeScript类型是否正确和完整
- 错误处理是否恰当和一致
- 性能考虑是否充分
- 测试覆盖是否足够

#### 3. 安全审查
- 输入验证是否严格
- 认证授权是否正确实现
- 敏感数据是否适当保护
- 日志记录是否避免敏感信息泄露

#### 4. 文档审查
- 代码注释是否清晰和有用
- API文档是否完整和准确
- 变更日志是否更新
- 部署说明是否清晰

### 发布流程

#### 1. 版本管理
- **版本号**: 遵循语义化版本控制 (SemVer)
- **变更日志**: 更新CHANGELOG.md文件
- **标签发布**: 创建Git标签并推送到远程仓库

#### 2. 构建和部署
```bash
# 1. 构建所有包
pnpm run build

# 2. 运行完整测试套件
pnpm run test

# 3. Docker镜像构建
docker build -t deeptrace:latest .

# 4. 部署到生产环境
# 根据部署环境执行相应的部署脚本
```

#### 3. 监控和验证
- **健康检查**: 验证服务健康状态
- **功能测试**: 验证核心功能正常工作
- **性能监控**: 监控系统性能和资源使用
- **错误监控**: 监控生产环境错误和异常

## 许可证

本项目基于MIT许可证开源，详情请查看 [LICENSE](LICENSE) 文件。

## 相关资源

- **官方文档**: [Langfuse Documentation](https://langfuse.com/docs)
- **GitHub仓库**: [Langfuse GitHub](https://github.com/langfuse/langfuse)
- **社区支持**: [Discord Community](https://langfuse.com/discord)
- **问题反馈**: [GitHub Issues](https://github.com/langfuse/langfuse/issues)

---

*本分析文档基于对Deeptrace项目的深入代码阅读和分析，旨在帮助开发者理解项目架构和核心代码关系。*