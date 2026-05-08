# 常见问题解答 (FAQ)

本文档收集了 Deeptrace 平台使用过程中的常见问题和解答。

---

## 数据集与评估

### Q: DatasetRun 是什么？页面上为什么没有直接运行数据集的按钮？

**A: DatasetRun 是实验运行的结果记录，通过 SDK 在代码中创建，在 UI 中查看和分析。**

#### DatasetRun 的含义

DatasetRun 代表对数据集进行的**一次完整实验运行的结果集合**，它记录了：

- 对数据集中所有或部分项目的测试运行
- 每个数据集项对应的实际执行 trace
- 运行的元数据（如模型版本、参数配置等）

#### 数据模型结构

```
DatasetRuns (实验运行)
├── name: string              # 运行名称，如 "gpt-4-experiment-1"
├── description: string       # 运行描述
├── metadata: json            # 运行元数据（模型、参数等）
└── datasetRunItems[]         # 运行项列表
    ├── datasetItemId         # 对应的数据集项
    ├── traceId               # 实际执行的 trace ID
    └── observationId         # 可选的 observation ID
```

#### 为什么没有"运行"按钮？

Deeptrace 采用 **SDK 驱动的设计理念**，原因如下：

1. **灵活性**：允许在代码中编写复杂的测试逻辑
2. **自动化**：可以集成到 CI/CD 流程中
3. **并行执行**：支持同时运行多个实验
4. **完全控制**：开发者可以精确控制评估过程

#### 如何创建 DatasetRun？

**通过 Python SDK 创建：**

```python
from langfuse import get_client

langfuse = get_client()

# 获取数据集
dataset = langfuse.get_dataset("my_dataset")

# 创建一个新的 Run
for item in dataset.items:
    # 使用 item.run() 上下文管理器自动链接 trace
    with item.run(
        run_name="gpt-4-experiment-1",  # Run 名称
        run_description="使用 GPT-4 进行测试",
        run_metadata={"model": "gpt-4", "temperature": 0.7}
    ) as root_span:
        # 执行你的应用逻辑
        output = my_llm_app(item.input)

        # 可选：添加评分
        root_span.score_trace(
            name="accuracy",
            value=evaluate(output, item.expected_output),
            comment="评估准确性"
        )

# 确保所有数据发送完成
langfuse.flush()
```

**通过 REST API 创建：**

```bash
POST /api/public/dataset-run-items
Content-Type: application/json

{
  "runName": "gpt-4-experiment-1",
  "runDescription": "使用 GPT-4 进行测试",
  "metadata": {"model": "gpt-4", "temperature": 0.7},
  "datasetItemId": "item-123",
  "traceId": "trace-456"
}
```

**API 工作原理：**
- 系统会自动 `upsert` DatasetRun（相同 `runName` 会合并）
- 相同运行名称的多个 items 会归到同一个 Run 下
- 自动关联 trace 和 dataset item，形成完整的实验记录

#### UI 的作用

页面上的 DatasetRuns 功能用于：

✅ **查看结果** - 查看已完成的运行结果
✅ **性能对比** - 对比不同运行的延迟、成本、分数
✅ **详细分析** - 查看每个运行项的详细 trace
✅ **实验管理** - 组织和管理多个实验版本

❌ **不用于触发运行** - 运行在代码中完成，不在 UI 中点击按钮

#### 典型使用场景

1. **模型对比实验**
   ```python
   # Run 1: GPT-4
   for item in dataset.items:
       with item.run(run_name="gpt-4-baseline") as span:
           output = gpt4_app(item.input)

   # Run 2: GPT-3.5
   for item in dataset.items:
       with item.run(run_name="gpt-3.5-baseline") as span:
           output = gpt35_app(item.input)

   # 在 UI 中对比两个 Run 的性能和成本
   ```

2. **Prompt 优化迭代**
   ```python
   # Run 1: 原始 prompt
   for item in dataset.items:
       with item.run(run_name="prompt-v1") as span:
           output = app(item.input, prompt_version="v1")

   # Run 2: 优化后的 prompt
   for item in dataset.items:
       with item.run(run_name="prompt-v2") as span:
           output = app(item.input, prompt_version="v2")

   # 在 UI 中查看哪个 prompt 版本效果更好
   ```

3. **CI/CD 自动化测试**
   ```python
   # 在 CI 流程中自动运行
   dataset = langfuse.get_dataset("regression-tests")
   for item in dataset.items:
       with item.run(run_name=f"ci-build-{BUILD_ID}") as span:
           output = app(item.input)
           score = evaluate(output, item.expected_output)
           span.score_trace(name="pass", value=score)
           if score < 0.8:
               raise Exception("测试未通过")
   ```

#### 相关代码位置

- **数据模型定义**: `packages/shared/prisma/schema.prisma:538-574`
- **API 端点**: `web/src/pages/api/public/dataset-run-items.ts`
- **UI 展示**: `web/src/features/datasets/components/DatasetRunsTable.tsx`
- **详情页面**: `web/src/pages/project/[projectId]/datasets/[datasetId]/runs/[runId].tsx`

---

## 观测与追踪

### Q: Observation 有哪几种类型？它们有什么区别？

**A: Observation 有三种类型：SPAN（跨度）、EVENT（事件）、GENERATION（生成），分别用于不同的追踪场景。**

#### 三种类型概览

| 类型 | 用途 | 有持续时间 | 特殊字段 |
|------|------|------------|----------|
| **SPAN** | 追踪代码执行范围 | ✅ 是 | 无 |
| **EVENT** | 记录瞬时事件 | ❌ 否 | 无 |
| **GENERATION** | 追踪 LLM 调用 | ✅ 是 | Token、成本、模型等 |

#### 1. SPAN（跨度）

**用途**：表示一个时间跨度或操作范围，用于追踪一段代码执行的开始和结束。

**特点**：
- 有明确的开始时间（`startTime`）和结束时间（`endTime`）
- 可以有父子关系（通过 `parentObservationId`）
- 适合追踪函数调用、API 请求、数据处理等操作

**使用示例**：

```python
from langfuse import get_client

langfuse = get_client()

# 创建一个 trace
trace = langfuse.trace(name="my-application")

# 创建一个 SPAN 来追踪数据处理
with trace.span(name="data-processing") as span:
    # 处理数据
    result = process_data(input_data)
    span.update(output=result)
```

#### 2. EVENT（事件）

**用途**：记录某个特定时刻发生的瞬时事件。

**特点**：
- 只有开始时间，通常没有结束时间
- 用于标记重要的时间点或状态变化
- 适合记录用户操作、系统事件、错误发生等

**使用示例**：

```python
# 记录一个事件
trace.event(
    name="user-feedback",
    input={"action": "thumbs_up"},
    metadata={"source": "chat_interface"}
)

# 记录错误事件
trace.event(
    name="validation-error",
    level="ERROR",
    status_message="Invalid input format",
    input={"error_code": "E001"}
)
```

#### 3. GENERATION（生成）

**用途**：专门用于追踪 LLM（大语言模型）的生成调用。

**特点**：
- 包含丰富的 LLM 专属字段
- 自动计算或记录成本
- 支持 Token 统计和性能分析

**专属字段**：

```
GENERATION 专属字段
├── model                    # 模型名称（如 "gpt-4"）
├── modelParameters          # 模型参数（temperature、max_tokens 等）
├── input / output           # 输入输出内容
├── promptTokens             # 提示词 token 数
├── completionTokens         # 生成内容 token 数
├── totalTokens              # 总 token 数
├── inputCost / outputCost   # 输入输出成本
├── totalCost                # 总成本
├── completionStartTime      # 生成开始时间（用于计算首 token 延迟）
└── promptId                 # 关联的 Prompt ID
```

**使用示例**：

```python
# 追踪 LLM 生成调用
generation = trace.generation(
    name="chat-completion",
    model="gpt-4",
    model_parameters={
        "temperature": 0.7,
        "max_tokens": 1000
    },
    input=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)

# 调用 LLM
response = openai.chat.completions.create(
    model="gpt-4",
    messages=messages
)

# 更新生成结果
generation.end(
    output=response.choices[0].message.content,
    usage={
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens
    }
)
```

#### 层级关系示例

一个典型的 Trace 结构可能如下：

```
Trace: "user-query-processing"
├── SPAN: "input-validation"
│   └── EVENT: "validation-passed"
├── GENERATION: "llm-response"
│   └── model: gpt-4
│   └── tokens: 150 / 200
├── SPAN: "post-processing"
│   ├── SPAN: "format-output"
│   └── SPAN: "save-to-db"
└── EVENT: "request-completed"
```

#### ObservationLevel（观测级别）

除了类型，每个 Observation 还有级别属性：

```prisma
enum ObservationLevel {
    DEBUG      # 调试信息
    DEFAULT    # 默认级别
    WARNING    # 警告信息
    ERROR      # 错误信息
}
```

**使用示例**：

```python
# 记录不同级别的观测
trace.event(name="debug-info", level="DEBUG", input={"step": 1})
trace.event(name="warning", level="WARNING", status_message="Rate limit approaching")
trace.event(name="error", level="ERROR", status_message="API call failed")
```

#### 何时使用哪种类型？

| 场景 | 推荐类型 | 原因 |
|------|----------|------|
| 追踪函数执行 | SPAN | 有明确的开始和结束 |
| 追踪 API 请求 | SPAN | 需要测量延迟 |
| 追踪 LLM 调用 | GENERATION | 需要记录 token 和成本 |
| 记录用户操作 | EVENT | 瞬时事件 |
| 记录错误/异常 | EVENT | 标记特定时刻 |
| 记录状态变化 | EVENT | 无需持续时间 |
| 包装多个操作 | SPAN | 可以包含子观测 |

#### 相关代码位置

- **类型枚举定义**: `packages/shared/prisma/schema.prisma:397-401`
- **级别枚举定义**: `packages/shared/prisma/schema.prisma:403-408`
- **Observation 模型**: `packages/shared/prisma/schema.prisma:287-348`
- **ObservationView 视图**: `packages/shared/prisma/schema.prisma:352-395`

---

## 数据摄入

### Q: 数据摄入支持哪些事件类型？每种类型有什么用途？

**A: 数据摄入 API 支持 8 种核心事件类型（另有 2 种 legacy 类型用于向后兼容），用于追踪 LLM 应用的完整生命周期。**

#### 核心事件类型（8 种）

| 序号 | 事件类型 | 用途 | 说明 |
|------|----------|------|------|
| 1 | `trace-create` | 创建追踪 | 创建一个新的请求追踪，作为顶层容器 |
| 2 | `score-create` | 创建评分 | 为 trace 或 observation 添加评分 |
| 3 | `event-create` | 创建事件观测 | 记录瞬时事件（无持续时间） |
| 4 | `span-create` | 创建跨度观测 | 创建有开始和结束时间的操作跨度 |
| 5 | `span-update` | 更新跨度观测 | 更新已存在的 span（如添加结束时间） |
| 6 | `generation-create` | 创建生成观测 | 创建 LLM 生成调用（专用于语言模型） |
| 7 | `generation-update` | 更新生成观测 | 更新已存在的 generation（如添加 token 统计） |
| 8 | `sdk-log` | SDK 日志 | 记录 SDK 内部日志，用于调试 |

#### Legacy 事件类型（2 种）

仅用于向后兼容，新项目不建议使用：

| 序号 | 事件类型 | 说明 |
|------|----------|------|
| 9 | `observation-create` | 旧版创建观测方式 |
| 10 | `observation-update` | 旧版更新观测方式 |

#### 事件类型定义位置

**代码位置：** `packages/shared/src/features/ingestion/types.ts` (第 337-350 行)

```typescript
export const eventTypes = {
  // 核心事件类型
  TRACE_CREATE: "trace-create",
  SCORE_CREATE: "score-create",
  EVENT_CREATE: "event-create",
  SPAN_CREATE: "span-create",
  SPAN_UPDATE: "span-update",
  GENERATION_CREATE: "generation-create",
  GENERATION_UPDATE: "generation-update",
  SDK_LOG: "sdk-log",

  // LEGACY，仅用于向后兼容
  OBSERVATION_CREATE: "observation-create",
  OBSERVATION_UPDATE: "observation-update",
} as const;
```

#### 批量摄入配置

**最大请求大小：** 4.5MB

**代码位置：** `web/src/pages/api/public/ingestion.ts` (第 45-51 行)

```typescript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4.5mb",
    },
  },
};
```

#### 典型使用示例

**批量摄入多个事件：**

```json
POST /api/public/ingestion
Content-Type: application/json
Authorization: Bearer <your-api-key>

{
  "batch": [
    {
      "id": "event-1",
      "type": "trace-create",
      "timestamp": "2025-01-18T10:00:00Z",
      "body": {
        "id": "trace-123",
        "name": "user-query",
        "userId": "user-456"
      }
    },
    {
      "id": "event-2",
      "type": "generation-create",
      "timestamp": "2025-01-18T10:00:01Z",
      "body": {
        "id": "gen-789",
        "traceId": "trace-123",
        "name": "llm-call",
        "model": "gpt-4",
        "startTime": "2025-01-18T10:00:01Z"
      }
    },
    {
      "id": "event-3",
      "type": "generation-update",
      "timestamp": "2025-01-18T10:00:03Z",
      "body": {
        "id": "gen-789",
        "endTime": "2025-01-18T10:00:03Z",
        "usage": {
          "promptTokens": 100,
          "completionTokens": 50,
          "totalTokens": 150
        }
      }
    },
    {
      "id": "event-4",
      "type": "score-create",
      "timestamp": "2025-01-18T10:00:04Z",
      "body": {
        "traceId": "trace-123",
        "name": "user-satisfaction",
        "value": 0.95,
        "dataType": "NUMERIC"
      }
    }
  ],
  "metadata": {
    "sdk": "python-sdk",
    "version": "2.65.1"
  }
}
```

#### 事件处理流程

1. **验证阶段**
   - 验证 API 密钥
   - 验证批次大小（最大 4.5MB）
   - 验证每个事件的 schema

2. **排序阶段**
   - UPDATE 类型事件排到最后
   - 相同类型按时间戳升序排列

3. **处理阶段**
   - 按顺序处理每个事件
   - 创建相应的数据库记录
   - 自动计算成本和指标

4. **持久化**
   - 事件原始数据保存到 `events` 表
   - 业务数据保存到对应的 `traces`、`observations`、`scores` 表

#### 成本计算支持

所有 GENERATION 类型事件都支持自动成本计算：

```typescript
// Usage 定义包含成本字段
export const Usage = z.object({
  input: z.number().int().nullish(),
  output: z.number().int().nullish(),
  total: z.number().int().nullish(),
  unit: z.nativeEnum(ModelUsageUnit).nullish(),
  inputCost: z.number().nullish(),    // 输入成本
  outputCost: z.number().nullish(),   // 输出成本
  totalCost: z.number().nullish(),    // 总成本
});
```

#### 相关代码位置

- **事件类型定义**: `packages/shared/src/features/ingestion/types.ts:337-411`
- **摄入端点**: `web/src/pages/api/public/ingestion.ts`
- **事件处理器**: `web/src/server/api/services/EventProcessor.ts`
- **批量限制配置**: `web/src/pages/api/public/ingestion.ts:45-51`

---

## 系统管理

### Q: 审计日志支持哪些资源类型？如何查看审计记录？

**A: 审计日志系统支持 17 种资源类型，涵盖平台核心功能的所有 CRUD 操作，记录完整的操作前后状态。**

#### 17 种可审计资源类型

| 序号 | 资源类型 | 中文名称 | 主要操作 | 说明 |
|------|----------|----------|----------|------|
| 1 | `membership` | 成员关系 | create, delete | 项目成员的添加和移除 |
| 2 | `membershipInvitation` | 成员邀请 | create, delete | 项目邀请的创建和删除 |
| 3 | `datasetItem` | 数据集项 | create, update | 数据集中测试项的修改 |
| 4 | `dataset` | 数据集 | create, update, delete | 数据集的完整生命周期 |
| 5 | `trace` | 追踪记录 | update | Trace 的手动修改操作 |
| 6 | `project` | 项目 | create, update, delete | 项目的完整管理 |
| 7 | `observation` | 观测记录 | update | Observation 的手动修改 |
| 8 | `score` | 评分 | create, update, delete | 评分的完整管理 |
| 9 | `model` | 模型配置 | create, update, delete | 模型定价和配置管理 |
| 10 | `prompt` | Prompt 模板 | create | Prompt 版本的创建 |
| 11 | `session` | 会话 | update | Session 的手动修改 |
| 12 | `apiKey` | API 密钥 | create, delete | API 密钥的创建和删除 |
| 13 | `evalTemplate` | 评估模板 | create, update, delete | 评估模板的管理 |
| 14 | `job` | 后台任务 | create | 批量任务的创建记录 |
| 15 | `posthogIntegration` | PostHog 集成 | create, update, delete | 第三方集成管理 |
| 16 | `llmApiKey` | LLM API 密钥 | create, update, delete | LLM 服务密钥管理 |
| 17 | `batchExport` | 批量导出 | create | 数据导出任务记录 |

#### 资源类型定义

**代码位置：** `web/src/features/audit-logs/auditLog.ts` (第 4-21 行)

```typescript
export type AuditableResource =
  | "membership"
  | "membershipInvitation"
  | "datasetItem"
  | "dataset"
  | "trace"
  | "project"
  | "observation"
  | "score"
  | "model"
  | "prompt"
  | "session"
  | "apiKey"
  | "evalTemplate"
  | "job"
  | "posthogIntegration"
  | "llmApiKey"
  | "batchExport";
```

#### 审计日志数据模型

**数据库表结构：** `audit_logs`

```prisma
model AuditLog {
  id              String      @id @default(cuid())
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @default(now()) @updatedAt

  // 操作者信息
  userId          String      // 操作用户 ID
  user            User        // 关联到用户
  userProjectRole ProjectRole // 用户在项目中的角色

  // 资源信息
  projectId       String      // 所属项目
  project         Project     // 关联到项目
  resourceType    String      // 资源类型（上述 17 种之一）
  resourceId      String      // 资源 ID

  // 操作信息
  action          String      // 操作类型（create/update/delete）
  before          String?     // 操作前状态（JSON 字符串）
  after           String?     // 操作后状态（JSON 字符串）
}
```

**代码位置：** `packages/shared/prisma/schema.prisma` (第 646-665 行)

#### 审计日志记录内容

每条审计记录包含以下信息：

1. **谁（Who）**
   - `userId`: 操作用户
   - `userProjectRole`: 用户角色（OWNER/ADMIN/MEMBER/VIEWER）

2. **何时（When）**
   - `createdAt`: 操作时间戳
   - `updatedAt`: 记录更新时间

3. **在哪（Where）**
   - `projectId`: 操作所在项目

4. **做了什么（What）**
   - `resourceType`: 操作的资源类型
   - `resourceId`: 资源的唯一标识
   - `action`: 具体操作（create/update/delete）

5. **变化内容（Changes）**
   - `before`: 操作前的完整状态（JSON）
   - `after`: 操作后的完整状态（JSON）

#### 使用示例

**在代码中记录审计日志：**

```typescript
import { auditLog } from "@/src/features/audit-logs/auditLog";

// 示例 1: 记录数据集创建
await auditLog({
  session: ctx.session,
  resourceType: "dataset",
  resourceId: dataset.id,
  projectId: input.projectId,
  action: "create",
  after: dataset,  // 创建后的完整对象
});

// 示例 2: 记录数据集更新
await auditLog({
  session: ctx.session,
  resourceType: "dataset",
  resourceId: dataset.id,
  projectId: input.projectId,
  action: "update",
  before: oldDataset,  // 更新前的状态
  after: newDataset,   // 更新后的状态
});

// 示例 3: 记录数据集删除
await auditLog({
  session: ctx.session,
  resourceType: "dataset",
  resourceId: dataset.id,
  projectId: input.projectId,
  action: "delete",
  before: deletedDataset,  // 删除前的状态
});
```

#### 审计日志的应用场景

1. **安全审计**
   - 追踪所有敏感操作（API 密钥创建、成员变更等）
   - 检测异常操作行为
   - 满足合规要求

2. **问题诊断**
   - 查看配置变更历史
   - 定位数据修改时间点
   - 追溯问题根源

3. **团队协作**
   - 了解谁修改了什么
   - 避免操作冲突
   - 团队操作透明化

4. **数据恢复**
   - 通过 `before` 字段查看历史状态
   - 支持数据回滚决策

#### 覆盖范围

审计日志在以下 14 个文件中被调用，覆盖所有关键操作：

```
✅ web/src/server/api/routers/traces.ts
✅ web/src/server/api/routers/sessions.ts
✅ web/src/server/api/routers/scores.ts
✅ web/src/server/api/routers/models.ts
✅ web/src/server/api/routers/batchExport.ts
✅ web/src/features/rbac/server/projectMembersRouter.ts
✅ web/src/features/public-api/server/apiKeyRouter.ts
✅ web/src/features/prompts/server/routers/promptRouter.ts
✅ web/src/features/projects/server/projectsRouter.ts
✅ web/src/features/posthog-integration/posthog-integration-router.ts
✅ web/src/features/llm-api-key/server/router.ts
✅ web/src/features/datasets/server/dataset-router.ts
✅ web/src/features/audit-logs/auditLog.ts
✅ web/src/ee/features/evals/server/router.ts
```

#### 查询审计日志示例

```typescript
// 查询特定项目的所有审计记录
const logs = await prisma.auditLog.findMany({
  where: {
    projectId: "project-123",
  },
  include: {
    user: true,  // 包含用户信息
  },
  orderBy: {
    createdAt: "desc",
  },
});

// 查询特定资源的操作历史
const resourceLogs = await prisma.auditLog.findMany({
  where: {
    resourceType: "dataset",
    resourceId: "dataset-456",
  },
  orderBy: {
    createdAt: "asc",
  },
});

// 查询特定用户的操作记录
const userLogs = await prisma.auditLog.findMany({
  where: {
    userId: "user-789",
    projectId: "project-123",
  },
});
```

#### 数据保留策略

- ✅ 审计日志永久保留
- ✅ 索引优化：`projectId`、`createdAt`、`updatedAt`
- ✅ 支持按项目删除时级联删除
- ✅ 支持按用户删除时级联删除

#### 相关代码位置

- **审计日志函数**: `web/src/features/audit-logs/auditLog.ts`
- **数据库模型**: `packages/shared/prisma/schema.prisma:646-665`
- **资源类型定义**: `web/src/features/audit-logs/auditLog.ts:4-21`
- **调用位置**: 14 个路由文件（见上方覆盖范围列表）

---

## 其他问题

更多问题正在整理中...

如有其他疑问，请查阅：
- [项目文档](./README.md)
- [开发指南](./CLAUDE.md)
- [贡献指南](./CONTRIBUTING.md)
