-- ==================================================
-- DeepTrace DM8 完整初始化脚本
-- 包含所有 26 个表 + 2 个视图
-- 使用 IF NOT EXISTS 防止重复创建
-- ==================================================

-- 用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200),
    "email" VARCHAR(200),
    "email_verified" TIMESTAMP,
    "password" VARCHAR(200),
    "image" VARCHAR(500),
    "admin" INT DEFAULT 0,
    "feature_flags" TEXT DEFAULT '[]',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 账户表 (NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "providerAccountId" VARCHAR(200) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INT,
    "expires_in" INT,
    "ext_expires_in" INT,
    "token_type" VARCHAR(50),
    "scope" VARCHAR(500),
    "id_token" TEXT,
    "session_state" VARCHAR(200),
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- 会话表 (NextAuth)
CREATE TABLE IF NOT EXISTS "Session" (
    "id" VARCHAR(100) NOT NULL,
    "session_token" VARCHAR(200) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- 验证令牌表
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" VARCHAR(200) NOT NULL,
    "token" VARCHAR(200) NOT NULL,
    "expires" TIMESTAMP NOT NULL
);

-- 项目表
CREATE TABLE IF NOT EXISTS "projects" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(200) NOT NULL,
    "cloud_config" TEXT,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS "project_memberships" (
    "project_id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("project_id", "user_id")
);

-- 成员邀请表
CREATE TABLE IF NOT EXISTS "membership_invitations" (
    "id" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    "project_id" VARCHAR(100) NOT NULL,
    "sender_id" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_invitations_pkey" PRIMARY KEY ("id")
);

-- API 密钥表
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(500),
    "public_key" VARCHAR(200) NOT NULL,
    "hashed_secret_key" VARCHAR(200) NOT NULL,
    "fast_hashed_secret_key" VARCHAR(200),
    "display_secret_key" VARCHAR(200) NOT NULL,
    "last_used_at" TIMESTAMP,
    "expires_at" TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- LLM API 密钥表
CREATE TABLE IF NOT EXISTS "llm_api_keys" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "provider" VARCHAR(50) NOT NULL,
    "adapter" VARCHAR(50) NOT NULL,
    "display_secret_key" VARCHAR(200) NOT NULL,
    "secret_key" VARCHAR(500) NOT NULL,
    "base_url" VARCHAR(500),
    "custom_models" TEXT DEFAULT '[]',
    "with_default_models" INT DEFAULT 1,
    "project_id" VARCHAR(100) NOT NULL,
    CONSTRAINT "llm_api_keys_pkey" PRIMARY KEY ("id")
);

-- 追踪会话表
CREATE TABLE IF NOT EXISTS "trace_sessions" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "bookmarked" INT DEFAULT 0,
    "public" INT DEFAULT 0,
    CONSTRAINT "trace_sessions_pkey" PRIMARY KEY ("id", "project_id")
);

-- 追踪表
CREATE TABLE IF NOT EXISTS "traces" (
    "id" VARCHAR(100) NOT NULL,
    "external_id" VARCHAR(200),
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(200),
    "user_id" VARCHAR(100),
    "metadata" TEXT,
    "release" VARCHAR(100),
    "version" VARCHAR(100),
    "project_id" VARCHAR(100) NOT NULL,
    "public" INT DEFAULT 0,
    "bookmarked" INT DEFAULT 0,
    "tags" TEXT DEFAULT '[]',
    "input" TEXT,
    "output" TEXT,
    "session_id" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- 观测表
CREATE TABLE IF NOT EXISTS "observations" (
    "id" VARCHAR(100) NOT NULL,
    "trace_id" VARCHAR(100),
    "project_id" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('SPAN', 'EVENT', 'GENERATION')),
    "start_time" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP,
    "name" VARCHAR(200),
    "metadata" TEXT,
    "parent_observation_id" VARCHAR(100),
    "level" VARCHAR(20) DEFAULT 'DEFAULT' CHECK ("level" IN ('DEBUG', 'DEFAULT', 'WARNING', 'ERROR')),
    "status_message" TEXT,
    "version" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "model" VARCHAR(200),
    "internal_model" VARCHAR(200),
    "internal_model_id" VARCHAR(100),
    "model_parameters" TEXT,
    "input" TEXT,
    "output" TEXT,
    "prompt_tokens" INT DEFAULT 0,
    "completion_tokens" INT DEFAULT 0,
    "total_tokens" INT DEFAULT 0,
    "unit" VARCHAR(50),
    "input_cost" DECIMAL(38,10),
    "output_cost" DECIMAL(38,10),
    "total_cost" DECIMAL(38,10),
    "calculated_input_cost" DECIMAL(38,10),
    "calculated_output_cost" DECIMAL(38,10),
    "calculated_total_cost" DECIMAL(38,10),
    "completion_start_time" TIMESTAMP,
    "prompt_id" VARCHAR(100),
    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- 评分表
CREATE TABLE IF NOT EXISTS "scores" (
    "id" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "value" DOUBLE PRECISION,
    "source" VARCHAR(20) NOT NULL CHECK ("source" IN ('API', 'REVIEW', 'EVAL')),
    "author_user_id" VARCHAR(100),
    "comment" TEXT,
    "trace_id" VARCHAR(100) NOT NULL,
    "observation_id" VARCHAR(100),
    "config_id" VARCHAR(100),
    "string_value" VARCHAR(500),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "data_type" VARCHAR(20) DEFAULT 'NUMERIC' CHECK ("data_type" IN ('CATEGORICAL', 'NUMERIC', 'BOOLEAN')),
    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- 评分配置表
CREATE TABLE IF NOT EXISTS "score_configs" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "data_type" VARCHAR(20) NOT NULL CHECK ("data_type" IN ('CATEGORICAL', 'NUMERIC', 'BOOLEAN')),
    "is_archived" INT DEFAULT 0,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,
    "categories" TEXT,
    "description" VARCHAR(1000),
    CONSTRAINT "score_configs_pkey" PRIMARY KEY ("id")
);

-- 定时任务表
CREATE TABLE IF NOT EXISTS "cron_jobs" (
    "name" VARCHAR(100) NOT NULL,
    "last_run" TIMESTAMP,
    "job_started_at" TIMESTAMP,
    "state" VARCHAR(200),
    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("name")
);

-- 数据集表
CREATE TABLE IF NOT EXISTS "datasets" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "project_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- 数据集项表
CREATE TABLE IF NOT EXISTS "dataset_items" (
    "id" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'ARCHIVED')),
    "input" TEXT,
    "expected_output" TEXT,
    "metadata" TEXT,
    "source_trace_id" VARCHAR(100),
    "source_observation_id" VARCHAR(100),
    "dataset_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dataset_items_pkey" PRIMARY KEY ("id")
);

-- 数据集运行表
CREATE TABLE IF NOT EXISTS "dataset_runs" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "dataset_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dataset_runs_pkey" PRIMARY KEY ("id")
);

-- 数据集运行项表
CREATE TABLE IF NOT EXISTS "dataset_run_items" (
    "id" VARCHAR(100) NOT NULL,
    "dataset_run_id" VARCHAR(100) NOT NULL,
    "dataset_item_id" VARCHAR(100) NOT NULL,
    "trace_id" VARCHAR(100) NOT NULL,
    "observation_id" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dataset_run_items_pkey" PRIMARY KEY ("id")
);

-- 事件表
CREATE TABLE IF NOT EXISTS "events" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "data" TEXT NOT NULL,
    "headers" TEXT DEFAULT '{}',
    "url" VARCHAR(1000),
    "method" VARCHAR(20),
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- 提示词表
CREATE TABLE IF NOT EXISTS "prompts" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "prompt" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "version" INT NOT NULL,
    "type" VARCHAR(20) DEFAULT 'text',
    "is_active" INT,
    "config" TEXT DEFAULT '{}',
    "tags" TEXT DEFAULT '[]',
    "labels" TEXT DEFAULT '[]',
    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- 模型表
CREATE TABLE IF NOT EXISTS "models" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100),
    "model_name" VARCHAR(200) NOT NULL,
    "match_pattern" VARCHAR(500) NOT NULL,
    "start_date" TIMESTAMP,
    "input_price" DECIMAL(38,10),
    "output_price" DECIMAL(38,10),
    "total_price" DECIMAL(38,10),
    "unit" VARCHAR(50),
    "tokenizer_id" VARCHAR(50),
    "tokenizer_config" TEXT,
    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user_id" VARCHAR(100) NOT NULL,
    "project_id" VARCHAR(100) NOT NULL,
    "user_project_role" VARCHAR(20) NOT NULL CHECK ("user_project_role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "before" TEXT,
    "after" TEXT,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- 评估模板表
CREATE TABLE IF NOT EXISTS "eval_templates" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "version" INT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "model_params" TEXT NOT NULL,
    "vars" TEXT DEFAULT '[]',
    "output_schema" TEXT NOT NULL,
    CONSTRAINT "eval_templates_pkey" PRIMARY KEY ("id")
);

-- 作业配置表
CREATE TABLE IF NOT EXISTS "job_configurations" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "job_type" VARCHAR(20) NOT NULL CHECK ("job_type" IN ('EVAL')),
    "status" VARCHAR(20) DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
    "eval_template_id" VARCHAR(100),
    "score_name" VARCHAR(200) NOT NULL,
    "filter" TEXT NOT NULL,
    "target_object" VARCHAR(100) NOT NULL,
    "variable_mapping" TEXT NOT NULL,
    "sampling" DECIMAL(38,10) NOT NULL,
    "delay" INT NOT NULL,
    CONSTRAINT "job_configurations_pkey" PRIMARY KEY ("id")
);

-- 作业执行表
CREATE TABLE IF NOT EXISTS "job_executions" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "job_configuration_id" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('COMPLETED', 'ERROR', 'PENDING', 'CANCELLED')),
    "start_time" TIMESTAMP,
    "end_time" TIMESTAMP,
    "error" TEXT,
    "job_input_trace_id" VARCHAR(100),
    "job_output_score_id" VARCHAR(100),
    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- SSO 配置表
CREATE TABLE IF NOT EXISTS "sso_configs" (
    "domain" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "auth_provider" VARCHAR(100) NOT NULL,
    "auth_config" TEXT,
    CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("domain")
);

-- PostHog 集成表
CREATE TABLE IF NOT EXISTS "posthog_integrations" (
    "project_id" VARCHAR(100) NOT NULL,
    "encrypted_posthog_api_key" VARCHAR(500) NOT NULL,
    "posthog_host_name" VARCHAR(500) NOT NULL,
    "last_sync_at" TIMESTAMP,
    "enabled" INT NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "posthog_integrations_pkey" PRIMARY KEY ("project_id")
);

-- 批量导出表
CREATE TABLE IF NOT EXISTS "batch_exports" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "finished_at" TIMESTAMP,
    "expires_at" TIMESTAMP,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "query" TEXT NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "url" VARCHAR(1000),
    "log" TEXT,
    CONSTRAINT "batch_exports_pkey" PRIMARY KEY ("id")
);

-- 任务队列表 (替代 BullMQ Redis 队列)
CREATE TABLE IF NOT EXISTS "job_queue" (
    "id" VARCHAR(100) NOT NULL,
    "queue_name" VARCHAR(100) NOT NULL,
    "job_name" VARCHAR(200) NOT NULL,
    "payload" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'active', 'completed', 'failed', 'delayed')),
    "priority" INT DEFAULT 0,
    "attempts" INT DEFAULT 0,
    "max_attempts" INT DEFAULT 5,
    "delay_until" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "failed_at" TIMESTAMP,
    "error" TEXT,
    "result" TEXT,
    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- ==================================================
-- 索引
-- ==================================================

-- users 索引
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Account 索引
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "Account_user_id_idx" ON "Account"("user_id");

-- Session 索引
CREATE UNIQUE INDEX IF NOT EXISTS "Session_session_token_key" ON "Session"("session_token");

-- verification_tokens 索引
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- project_memberships 索引
CREATE INDEX IF NOT EXISTS "project_memberships_user_id_idx" ON "project_memberships"("user_id");

-- membership_invitations 索引
CREATE INDEX IF NOT EXISTS "membership_invitations_project_id_idx" ON "membership_invitations"("project_id");
CREATE INDEX IF NOT EXISTS "membership_invitations_email_idx" ON "membership_invitations"("email");

-- api_keys 索引
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_public_key_key" ON "api_keys"("public_key");
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_hashed_secret_key_key" ON "api_keys"("hashed_secret_key");
CREATE INDEX IF NOT EXISTS "api_keys_project_id_idx" ON "api_keys"("project_id");

-- llm_api_keys 索引
CREATE UNIQUE INDEX IF NOT EXISTS "llm_api_keys_project_id_provider_key" ON "llm_api_keys"("project_id", "provider");

-- trace_sessions 索引
CREATE INDEX IF NOT EXISTS "trace_sessions_project_id_idx" ON "trace_sessions"("project_id");

-- traces 索引
CREATE INDEX IF NOT EXISTS "traces_project_id_idx" ON "traces"("project_id");
CREATE INDEX IF NOT EXISTS "traces_session_id_idx" ON "traces"("session_id");
CREATE INDEX IF NOT EXISTS "traces_timestamp_idx" ON "traces"("timestamp");
CREATE INDEX IF NOT EXISTS "traces_user_id_idx" ON "traces"("user_id");
CREATE INDEX IF NOT EXISTS "traces_name_idx" ON "traces"("name");

-- observations 索引
CREATE INDEX IF NOT EXISTS "observations_trace_id_idx" ON "observations"("trace_id");
CREATE INDEX IF NOT EXISTS "observations_project_id_idx" ON "observations"("project_id");
CREATE INDEX IF NOT EXISTS "observations_type_idx" ON "observations"("type");
CREATE INDEX IF NOT EXISTS "observations_start_time_idx" ON "observations"("start_time");
CREATE INDEX IF NOT EXISTS "observations_model_idx" ON "observations"("model");
CREATE INDEX IF NOT EXISTS "observations_prompt_id_idx" ON "observations"("prompt_id");

-- scores 索引
CREATE INDEX IF NOT EXISTS "scores_trace_id_idx" ON "scores"("trace_id");
CREATE INDEX IF NOT EXISTS "scores_project_id_idx" ON "scores"("project_id");
CREATE INDEX IF NOT EXISTS "scores_timestamp_idx" ON "scores"("timestamp");
CREATE INDEX IF NOT EXISTS "scores_name_idx" ON "scores"("name");

-- score_configs 索引
CREATE INDEX IF NOT EXISTS "score_configs_project_id_idx" ON "score_configs"("project_id");

-- datasets 索引
CREATE UNIQUE INDEX IF NOT EXISTS "datasets_project_id_name_key" ON "datasets"("project_id", "name");
CREATE INDEX IF NOT EXISTS "datasets_project_id_idx" ON "datasets"("project_id");

-- dataset_items 索引
CREATE INDEX IF NOT EXISTS "dataset_items_dataset_id_idx" ON "dataset_items"("dataset_id");

-- dataset_runs 索引
CREATE UNIQUE INDEX IF NOT EXISTS "dataset_runs_dataset_id_name_key" ON "dataset_runs"("dataset_id", "name");
CREATE INDEX IF NOT EXISTS "dataset_runs_dataset_id_idx" ON "dataset_runs"("dataset_id");

-- dataset_run_items 索引
CREATE INDEX IF NOT EXISTS "dataset_run_items_dataset_run_id_idx" ON "dataset_run_items"("dataset_run_id");
CREATE INDEX IF NOT EXISTS "dataset_run_items_dataset_item_id_idx" ON "dataset_run_items"("dataset_item_id");

-- events 索引
CREATE INDEX IF NOT EXISTS "events_project_id_idx" ON "events"("project_id");

-- prompts 索引
CREATE UNIQUE INDEX IF NOT EXISTS "prompts_project_id_name_version_key" ON "prompts"("project_id", "name", "version");
CREATE INDEX IF NOT EXISTS "prompts_project_id_idx" ON "prompts"("project_id");

-- models 索引
CREATE UNIQUE INDEX IF NOT EXISTS "models_project_id_model_name_start_date_unit_key" ON "models"("project_id", "model_name", "start_date", "unit");
CREATE INDEX IF NOT EXISTS "models_project_id_model_name_idx" ON "models"("project_id", "model_name");

-- audit_logs 索引
CREATE INDEX IF NOT EXISTS "audit_logs_project_id_idx" ON "audit_logs"("project_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- eval_templates 索引
CREATE UNIQUE INDEX IF NOT EXISTS "eval_templates_project_id_name_version_key" ON "eval_templates"("project_id", "name", "version");
CREATE INDEX IF NOT EXISTS "eval_templates_project_id_idx" ON "eval_templates"("project_id");

-- job_configurations 索引
CREATE INDEX IF NOT EXISTS "job_configurations_project_id_idx" ON "job_configurations"("project_id");

-- job_executions 索引
CREATE INDEX IF NOT EXISTS "job_executions_project_id_idx" ON "job_executions"("project_id");
CREATE INDEX IF NOT EXISTS "job_executions_job_configuration_id_idx" ON "job_executions"("job_configuration_id");

-- batch_exports 索引
CREATE INDEX IF NOT EXISTS "batch_exports_project_id_user_id_idx" ON "batch_exports"("project_id", "user_id");
CREATE INDEX IF NOT EXISTS "batch_exports_status_idx" ON "batch_exports"("status");

-- job_queue 索引
CREATE INDEX IF NOT EXISTS "job_queue_status_queue_name_idx" ON "job_queue"("status", "queue_name");
CREATE INDEX IF NOT EXISTS "job_queue_created_at_idx" ON "job_queue"("created_at");

-- ==================================================
-- 视图
-- ==================================================

-- 观测视图 (带模型信息)
CREATE OR REPLACE VIEW "observations_view" AS
WITH model_ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY "project_id", "model_name", "unit"
            ORDER BY "project_id" ASC, "start_date" DESC NULLS LAST
        ) AS rn
    FROM "models"
)
SELECT
    o."id",
    o."trace_id",
    o."project_id",
    o."type",
    o."start_time",
    o."end_time",
    o."name",
    o."metadata",
    o."parent_observation_id",
    o."level",
    o."status_message",
    o."version",
    o."created_at",
    o."updated_at",
    o."model",
    o."internal_model",
    o."internal_model_id",
    o."model_parameters",
    o."input",
    o."output",
    o."prompt_tokens",
    o."completion_tokens",
    o."total_tokens",
    o."unit",
    o."input_cost",
    o."output_cost",
    o."total_cost",
    o."completion_start_time",
    o."prompt_id",
    m."id" AS "model_id",
    m."start_date" AS "model_start_date",
    m."input_price",
    m."output_price",
    m."total_price",
    m."tokenizer_config",
    CASE
        WHEN o."input_cost" IS NULL AND o."output_cost" IS NULL AND o."total_cost" IS NULL THEN
            CAST(o."prompt_tokens" AS DECIMAL) * m."input_price"
        ELSE o."input_cost"
    END AS "calculated_input_cost",
    CASE
        WHEN o."input_cost" IS NULL AND o."output_cost" IS NULL AND o."total_cost" IS NULL THEN
            CAST(o."completion_tokens" AS DECIMAL) * m."output_price"
        ELSE o."output_cost"
    END AS "calculated_output_cost",
    CASE
        WHEN o."input_cost" IS NULL AND o."output_cost" IS NULL AND o."total_cost" IS NULL THEN
            CASE
                WHEN m."total_price" IS NOT NULL AND o."total_tokens" IS NOT NULL THEN
                    m."total_price" * o."total_tokens"
                ELSE
                    CAST(o."prompt_tokens" AS DECIMAL) * m."input_price" +
                    CAST(o."completion_tokens" AS DECIMAL) * m."output_price"
            END
        ELSE o."total_cost"
    END AS "calculated_total_cost",
    CASE
        WHEN o."end_time" IS NULL THEN NULL
        ELSE DATEDIFF(SS, o."start_time", o."end_time")
    END AS "latency",
    CASE
        WHEN o."completion_start_time" IS NULL THEN NULL
        ELSE DATEDIFF(SS, o."start_time", o."completion_start_time")
    END AS "time_to_first_token"
FROM "observations" o
LEFT JOIN model_ranked m ON
    m.rn = 1 AND
    (m."project_id" = o."project_id" OR m."project_id" IS NULL) AND
    m."model_name" = o."internal_model" AND
    (m."start_date" < o."start_time" OR m."start_date" IS NULL) AND
    CAST(o."unit" AS VARCHAR) = m."unit";

-- 追踪视图 (带时长信息)
CREATE OR REPLACE VIEW "traces_view" AS
WITH observations_metrics AS (
    SELECT
        "trace_id",
        "project_id",
        DATEDIFF(SS,
            MIN("start_time"),
            COALESCE(MAX("end_time"), MAX("start_time"))
        ) AS "duration"
    FROM "observations"
    GROUP BY "project_id", "trace_id"
)
SELECT
    t.*,
    o."duration"
FROM "traces" t
LEFT JOIN observations_metrics o ON
    o."trace_id" = t."id" AND
    o."project_id" = t."project_id";
