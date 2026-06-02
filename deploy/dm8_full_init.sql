-- ==================================================
-- DeepTrace DM8 初始化脚本
-- 基于 PostgreSQL init.sql 转换
-- 转换日期: 2026-05-29
-- 注意事项:
--   1. BOOLEAN → INT (1=true, 0=false)
--   2. DECIMAL(65,30) → DECIMAL(38,10)
--   3. TEXT[] → TEXT (JSON 数组字符串)
--   4. JSONB → TEXT (JSON 字符串)
--   5. ENUM → VARCHAR + CHECK 约束
--   6. 去掉 USING HASH, GIN 等 PG 特定索引
-- ==================================================

-- ==================================================
-- 用户表
-- ==================================================
CREATE TABLE "users" (
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

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- ==================================================
-- 账户表 (NextAuth)
-- ==================================================
CREATE TABLE "Account" (
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

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_user_id_idx" ON "Account"("user_id");

-- ==================================================
-- 会话表 (NextAuth)
-- ==================================================
CREATE TABLE "Session" (
    "id" VARCHAR(100) NOT NULL,
    "session_token" VARCHAR(200) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- ==================================================
-- 验证令牌表
-- ==================================================
CREATE TABLE "verification_tokens" (
    "identifier" VARCHAR(200) NOT NULL,
    "token" VARCHAR(200) NOT NULL,
    "expires" TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ==================================================
-- 项目表
-- ==================================================
CREATE TABLE "projects" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(200) NOT NULL,
    "cloud_config" TEXT,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- ==================================================
-- 项目成员表
-- ==================================================
CREATE TABLE "project_memberships" (
    "project_id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("project_id", "user_id")
);

CREATE INDEX "project_memberships_user_id_idx" ON "project_memberships"("user_id");

-- ==================================================
-- 成员邀请表
-- ==================================================
CREATE TABLE "membership_invitations" (
    "id" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    "project_id" VARCHAR(100) NOT NULL,
    "sender_id" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_invitations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "membership_invitations_project_id_idx" ON "membership_invitations"("project_id");
CREATE INDEX "membership_invitations_email_idx" ON "membership_invitations"("email");

-- ==================================================
-- API 密钥表
-- ==================================================
CREATE TABLE "api_keys" (
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

CREATE UNIQUE INDEX "api_keys_id_key" ON "api_keys"("id");
CREATE UNIQUE INDEX "api_keys_public_key_key" ON "api_keys"("public_key");
CREATE UNIQUE INDEX "api_keys_hashed_secret_key_key" ON "api_keys"("hashed_secret_key");
CREATE UNIQUE INDEX "api_keys_fast_hashed_secret_key_key" ON "api_keys"("fast_hashed_secret_key");
CREATE INDEX "api_keys_project_id_idx" ON "api_keys"("project_id");
CREATE INDEX "api_keys_public_key_idx" ON "api_keys"("public_key");
CREATE INDEX "api_keys_hashed_secret_key_idx" ON "api_keys"("hashed_secret_key");
CREATE INDEX "api_keys_fast_hashed_secret_key_idx" ON "api_keys"("fast_hashed_secret_key");

-- ==================================================
-- LLM API 密钥表
-- ==================================================
CREATE TABLE "llm_api_keys" (
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

CREATE UNIQUE INDEX "llm_api_keys_project_id_provider_key" ON "llm_api_keys"("project_id", "provider");
CREATE INDEX "llm_api_keys_project_id_provider_idx" ON "llm_api_keys"("project_id", "provider");

-- ==================================================
-- 追踪会话表
-- ==================================================
CREATE TABLE "trace_sessions" (
    "id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "project_id" VARCHAR(100) NOT NULL,
    "bookmarked" INT DEFAULT 0,
    "public" INT DEFAULT 0,
    CONSTRAINT "trace_sessions_pkey" PRIMARY KEY ("id", "project_id")
);

CREATE INDEX "trace_sessions_project_id_idx" ON "trace_sessions"("project_id");
CREATE INDEX "trace_sessions_created_at_idx" ON "trace_sessions"("created_at");

-- ==================================================
-- 追踪表
-- ==================================================
CREATE TABLE "traces" (
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

CREATE INDEX "traces_project_id_idx" ON "traces"("project_id");
CREATE INDEX "traces_session_id_idx" ON "traces"("session_id");
CREATE INDEX "traces_name_idx" ON "traces"("name");
CREATE INDEX "traces_user_id_idx" ON "traces"("user_id");
CREATE INDEX "traces_external_id_idx" ON "traces"("external_id");
CREATE INDEX "traces_timestamp_idx" ON "traces"("timestamp");
CREATE INDEX "traces_created_at_idx" ON "traces"("created_at");
CREATE INDEX "traces_id_user_id_idx" ON "traces"("id", "user_id");
CREATE INDEX "traces_release_idx" ON "traces"("release");

-- ==================================================
-- 观测表
-- ==================================================
CREATE TABLE "observations" (
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

CREATE UNIQUE INDEX "observations_id_project_id_key" ON "observations"("id", "project_id");
CREATE INDEX "observations_trace_id_idx" ON "observations"("trace_id");
CREATE INDEX "observations_type_idx" ON "observations"("type");
CREATE INDEX "observations_start_time_idx" ON "observations"("start_time");
CREATE INDEX "observations_created_at_idx" ON "observations"("created_at");
CREATE INDEX "observations_project_id_idx" ON "observations"("project_id");
CREATE INDEX "observations_model_idx" ON "observations"("model");
CREATE INDEX "observations_internal_model_idx" ON "observations"("internal_model");
CREATE INDEX "observations_parent_observation_id_idx" ON "observations"("parent_observation_id");
CREATE INDEX "observations_prompt_id_idx" ON "observations"("prompt_id");
CREATE INDEX "observations_project_id_start_time_type_idx" ON "observations"("project_id", "start_time", "type");
CREATE INDEX "observations_project_id_internal_model_start_time_unit_idx" ON "observations"("project_id", "internal_model", "start_time", "unit");
CREATE INDEX "observations_trace_id_project_id_idx" ON "observations"("trace_id", "project_id");
CREATE INDEX "observations_trace_id_project_id_start_time_idx" ON "observations"("trace_id", "project_id", "start_time");
CREATE INDEX "observations_trace_id_project_id_type_start_time_idx" ON "observations"("trace_id", "project_id", "type", "start_time");
CREATE INDEX "observations_project_id_id_idx" ON "observations"("project_id", "id");

-- ==================================================
-- 评分表
-- ==================================================
CREATE TABLE "scores" (
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

CREATE UNIQUE INDEX "scores_id_trace_id_key" ON "scores"("id", "trace_id");
CREATE INDEX "scores_timestamp_idx" ON "scores"("timestamp");
CREATE INDEX "scores_value_idx" ON "scores"("value");
CREATE INDEX "scores_project_id_idx" ON "scores"("project_id");
CREATE INDEX "scores_project_id_name_idx" ON "scores"("project_id", "name");
CREATE INDEX "scores_author_user_id_idx" ON "scores"("author_user_id");
CREATE INDEX "scores_config_id_idx" ON "scores"("config_id");
CREATE INDEX "scores_trace_id_idx" ON "scores"("trace_id");
CREATE INDEX "scores_observation_id_idx" ON "scores"("observation_id");
CREATE INDEX "scores_source_idx" ON "scores"("source");
CREATE INDEX "scores_created_at_idx" ON "scores"("created_at");

-- ==================================================
-- 评分配置表
-- ==================================================
CREATE TABLE "score_configs" (
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

CREATE UNIQUE INDEX "score_configs_id_project_id_key" ON "score_configs"("id", "project_id");
CREATE INDEX "score_configs_data_type_idx" ON "score_configs"("data_type");
CREATE INDEX "score_configs_is_archived_idx" ON "score_configs"("is_archived");
CREATE INDEX "score_configs_project_id_idx" ON "score_configs"("project_id");
CREATE INDEX "score_configs_categories_idx" ON "score_configs"("categories");
CREATE INDEX "score_configs_created_at_idx" ON "score_configs"("created_at");
CREATE INDEX "score_configs_updated_at_idx" ON "score_configs"("updated_at");

-- ==================================================
-- 定时任务表
-- ==================================================
CREATE TABLE "cron_jobs" (
    "name" VARCHAR(100) NOT NULL,
    "last_run" TIMESTAMP,
    "job_started_at" TIMESTAMP,
    "state" VARCHAR(200),
    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("name")
);

-- ==================================================
-- 数据集表
-- ==================================================
CREATE TABLE "datasets" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "project_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "datasets_project_id_name_key" ON "datasets"("project_id", "name");
CREATE INDEX "datasets_project_id_idx" ON "datasets"("project_id");
CREATE INDEX "datasets_created_at_idx" ON "datasets"("created_at");
CREATE INDEX "datasets_updated_at_idx" ON "datasets"("updated_at");

-- ==================================================
-- 数据集项表
-- ==================================================
CREATE TABLE "dataset_items" (
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

CREATE INDEX "dataset_items_source_trace_id_idx" ON "dataset_items"("source_trace_id");
CREATE INDEX "dataset_items_source_observation_id_idx" ON "dataset_items"("source_observation_id");
CREATE INDEX "dataset_items_dataset_id_idx" ON "dataset_items"("dataset_id");
CREATE INDEX "dataset_items_created_at_idx" ON "dataset_items"("created_at");
CREATE INDEX "dataset_items_updated_at_idx" ON "dataset_items"("updated_at");

-- ==================================================
-- 数据集运行表
-- ==================================================
CREATE TABLE "dataset_runs" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "dataset_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dataset_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dataset_runs_dataset_id_name_key" ON "dataset_runs"("dataset_id", "name");
CREATE INDEX "dataset_runs_dataset_id_idx" ON "dataset_runs"("dataset_id");
CREATE INDEX "dataset_runs_created_at_idx" ON "dataset_runs"("created_at");
CREATE INDEX "dataset_runs_updated_at_idx" ON "dataset_runs"("updated_at");

-- ==================================================
-- 数据集运行项表
-- ==================================================
CREATE TABLE "dataset_run_items" (
    "id" VARCHAR(100) NOT NULL,
    "dataset_run_id" VARCHAR(100) NOT NULL,
    "dataset_item_id" VARCHAR(100) NOT NULL,
    "trace_id" VARCHAR(100) NOT NULL,
    "observation_id" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dataset_run_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dataset_run_items_dataset_run_id_idx" ON "dataset_run_items"("dataset_run_id");
CREATE INDEX "dataset_run_items_dataset_item_id_idx" ON "dataset_run_items"("dataset_item_id");
CREATE INDEX "dataset_run_items_observation_id_idx" ON "dataset_run_items"("observation_id");
CREATE INDEX "dataset_run_items_trace_id_idx" ON "dataset_run_items"("trace_id");
CREATE INDEX "dataset_run_items_created_at_idx" ON "dataset_run_items"("created_at");
CREATE INDEX "dataset_run_items_updated_at_idx" ON "dataset_run_items"("updated_at");

-- ==================================================
-- 事件表
-- ==================================================
CREATE TABLE "events" (
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

CREATE INDEX "events_project_id_idx" ON "events"("project_id");

-- ==================================================
-- 提示词表
-- ==================================================
CREATE TABLE "prompts" (
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

CREATE UNIQUE INDEX "prompts_project_id_name_version_key" ON "prompts"("project_id", "name", "version");
CREATE INDEX "prompts_project_id_name_version_idx" ON "prompts"("project_id", "name", "version");
CREATE INDEX "prompts_project_id_id_idx" ON "prompts"("project_id", "id");
CREATE INDEX "prompts_project_id_idx" ON "prompts"("project_id");
CREATE INDEX "prompts_created_at_idx" ON "prompts"("created_at");
CREATE INDEX "prompts_updated_at_idx" ON "prompts"("updated_at");

-- ==================================================
-- 模型表
-- ==================================================
CREATE TABLE "models" (
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

CREATE UNIQUE INDEX "models_project_id_model_name_start_date_unit_key" ON "models"("project_id", "model_name", "start_date", "unit");
CREATE INDEX "models_project_id_model_name_idx" ON "models"("project_id", "model_name");
CREATE INDEX "models_project_id_model_name_start_date_unit_idx" ON "models"("project_id", "model_name", "start_date", "unit");
CREATE INDEX "models_model_name_idx" ON "models"("model_name");

-- ==================================================
-- 审计日志表
-- ==================================================
CREATE TABLE "audit_logs" (
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

CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs"("project_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- ==================================================
-- 评估模板表
-- ==================================================
CREATE TABLE "eval_templates" (
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

CREATE UNIQUE INDEX "eval_templates_project_id_name_version_key" ON "eval_templates"("project_id", "name", "version");
CREATE INDEX "eval_templates_project_id_id_idx" ON "eval_templates"("project_id", "id");
CREATE INDEX "eval_templates_project_id_idx" ON "eval_templates"("project_id");

-- ==================================================
-- 作业配置表
-- ==================================================
CREATE TABLE "job_configurations" (
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

CREATE INDEX "job_configurations_project_id_id_idx" ON "job_configurations"("project_id", "id");
CREATE INDEX "job_configurations_project_id_idx" ON "job_configurations"("project_id");

-- ==================================================
-- 作业执行表
-- ==================================================
CREATE TABLE "job_executions" (
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

CREATE INDEX "job_executions_project_id_id_idx" ON "job_executions"("project_id", "id");
CREATE INDEX "job_executions_project_id_idx" ON "job_executions"("project_id");
CREATE INDEX "job_executions_project_id_status_idx" ON "job_executions"("project_id", "status");
CREATE INDEX "job_executions_job_configuration_id_idx" ON "job_executions"("job_configuration_id");
CREATE INDEX "job_executions_job_output_score_id_idx" ON "job_executions"("job_output_score_id");
CREATE INDEX "job_executions_job_input_trace_id_idx" ON "job_executions"("job_input_trace_id");
CREATE INDEX "job_executions_created_at_idx" ON "job_executions"("created_at");
CREATE INDEX "job_executions_updated_at_idx" ON "job_executions"("updated_at");

-- ==================================================
-- SSO 配置表
-- ==================================================
CREATE TABLE "sso_configs" (
    "domain" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "auth_provider" VARCHAR(100) NOT NULL,
    "auth_config" TEXT,
    CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("domain")
);

-- ==================================================
-- PostHog 集成表
-- ==================================================
CREATE TABLE "posthog_integrations" (
    "project_id" VARCHAR(100) NOT NULL,
    "encrypted_posthog_api_key" VARCHAR(500) NOT NULL,
    "posthog_host_name" VARCHAR(500) NOT NULL,
    "last_sync_at" TIMESTAMP,
    "enabled" INT NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "posthog_integrations_pkey" PRIMARY KEY ("project_id")
);

CREATE INDEX "posthog_integrations_project_id_idx" ON "posthog_integrations"("project_id");

-- ==================================================
-- 批量导出表
-- ==================================================
CREATE TABLE "batch_exports" (
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

CREATE INDEX "batch_exports_project_id_user_id_idx" ON "batch_exports"("project_id", "user_id");
CREATE INDEX "batch_exports_status_idx" ON "batch_exports"("status");

-- ==================================================
-- 任务队列表 (替代 BullMQ Redis 队列)
-- ==================================================
CREATE TABLE "job_queue" (
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

CREATE INDEX "job_queue_status_queue_name_idx" ON "job_queue" ("status", "queue_name");
CREATE INDEX "job_queue_delay_until_idx" ON "job_queue" ("delay_until", "status");
CREATE INDEX "job_queue_created_at_idx" ON "job_queue" ("created_at");
CREATE INDEX "job_queue_queue_name_idx" ON "job_queue" ("queue_name");

-- ==================================================
-- 外键约束
-- ==================================================

-- Account -> User
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Session -> User
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- ProjectMembership -> Project, User
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- MembershipInvitation -> Project, User
ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- ApiKey -> Project
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- LlmApiKey -> Project
ALTER TABLE "llm_api_keys" ADD CONSTRAINT "llm_api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- TraceSession -> Project
ALTER TABLE "trace_sessions" ADD CONSTRAINT "trace_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- Trace -> Project, TraceSession
ALTER TABLE "traces" ADD CONSTRAINT "traces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "traces" ADD CONSTRAINT "traces_session_id_project_id_fkey" FOREIGN KEY ("session_id", "project_id") REFERENCES "trace_sessions"("id", "project_id");

-- Observation -> Project
ALTER TABLE "observations" ADD CONSTRAINT "observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- Score -> Project, Trace, Observation, ScoreConfig
ALTER TABLE "scores" ADD CONSTRAINT "scores_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE SET NULL;
ALTER TABLE "scores" ADD CONSTRAINT "scores_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "score_configs"("id") ON DELETE SET NULL;

-- ScoreConfig -> Project
ALTER TABLE "score_configs" ADD CONSTRAINT "score_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- Dataset -> Project
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- DatasetItem -> Dataset, Trace, Observation
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE;
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_source_trace_id_fkey" FOREIGN KEY ("source_trace_id") REFERENCES "traces"("id") ON DELETE SET NULL;
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_source_observation_id_fkey" FOREIGN KEY ("source_observation_id") REFERENCES "observations"("id") ON DELETE SET NULL;

-- DatasetRun -> Dataset
ALTER TABLE "dataset_runs" ADD CONSTRAINT "dataset_runs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE;

-- DatasetRunItem -> DatasetRun, DatasetItem, Trace, Observation
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_run_id_fkey" FOREIGN KEY ("dataset_run_id") REFERENCES "dataset_runs"("id") ON DELETE CASCADE;
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_item_id_fkey" FOREIGN KEY ("dataset_item_id") REFERENCES "dataset_items"("id") ON DELETE CASCADE;
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE;
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE CASCADE;

-- Event -> Project
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- Prompt -> Project
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- Model -> Project
ALTER TABLE "models" ADD CONSTRAINT "models_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- AuditLog -> User, Project
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- EvalTemplate -> Project
ALTER TABLE "eval_templates" ADD CONSTRAINT "eval_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- JobConfiguration -> Project, EvalTemplate
ALTER TABLE "job_configurations" ADD CONSTRAINT "job_configurations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "job_configurations" ADD CONSTRAINT "job_configurations_eval_template_id_fkey" FOREIGN KEY ("eval_template_id") REFERENCES "eval_templates"("id") ON DELETE SET NULL;

-- JobExecution -> Project, JobConfiguration, Trace, Score
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_configuration_id_fkey" FOREIGN KEY ("job_configuration_id") REFERENCES "job_configurations"("id") ON DELETE CASCADE;
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_input_trace_id_fkey" FOREIGN KEY ("job_input_trace_id") REFERENCES "traces"("id") ON DELETE SET NULL;
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_output_score_id_fkey" FOREIGN KEY ("job_output_score_id") REFERENCES "scores"("id") ON DELETE SET NULL;

-- PosthogIntegration -> Project
ALTER TABLE "posthog_integrations" ADD CONSTRAINT "posthog_integrations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- BatchExport -> Project, User
ALTER TABLE "batch_exports" ADD CONSTRAINT "batch_exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "batch_exports" ADD CONSTRAINT "batch_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

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
    m."tokenizer_config" AS "tokenizer_config",
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
LEFT JOIN observations_metrics o ON t."id" = o."trace_id" AND t."project_id" = o."project_id";

-- ==================================================
-- 初始数据: 定时任务 (使用 MERGE INTO 避免重复)
-- ==================================================
MERGE INTO "cron_jobs" t
USING (SELECT 'eval-execution-cron' AS "name" FROM dual) s
ON (t."name" = s."name")
WHEN NOT MATCHED THEN INSERT ("name") VALUES (s."name");

MERGE INTO "cron_jobs" t
USING (SELECT 'batch-export-cron' AS "name" FROM dual) s
ON (t."name" = s."name")
WHEN NOT MATCHED THEN INSERT ("name") VALUES (s."name");

MERGE INTO "cron_jobs" t
USING (SELECT 'ingestion-flush-cron' AS "name" FROM dual) s
ON (t."name" = s."name")
WHEN NOT MATCHED THEN INSERT ("name") VALUES (s."name");

COMMIT;
-- ==================================================
-- DM8 性能优化索引脚本
-- 在 dm8_init.sql 执行后运行此脚本
-- ==================================================

-- ==================================================
-- 1. 项目切换优化索引
-- ==================================================

-- 项目成员表复合索引（加速用户项目列表查询）
CREATE INDEX "project_memberships_user_project_idx" ON "project_memberships"("user_id", "project_id");
CREATE INDEX "project_memberships_project_user_idx" ON "project_memberships"("project_id", "user_id");

-- 用户表索引（加速登录查询）
CREATE INDEX "users_email_idx" ON "users"("email");

-- ==================================================
-- 2. Dashboard 查询优化索引
-- ==================================================

-- 追踪表复合索引（加速时间范围查询）
CREATE INDEX "traces_project_timestamp_idx" ON "traces"("project_id", "timestamp");
CREATE INDEX "traces_project_created_at_idx" ON "traces"("project_id", "created_at");

-- 观测表复合索引（加速聚合查询）
CREATE INDEX "observations_project_trace_idx" ON "observations"("project_id", "trace_id");
CREATE INDEX "observations_project_type_time_idx" ON "observations"("project_id", "type", "start_time");
CREATE INDEX "observations_trace_type_idx" ON "observations"("trace_id", "type");

-- 评分表复合索引
CREATE INDEX "scores_project_trace_idx" ON "scores"("project_id", "trace_id");
CREATE INDEX "scores_project_name_idx" ON "scores"("project_id", "name");

-- ==================================================
-- 3. API 密钥操作优化索引
-- ==================================================

-- API 密钥表复合索引
CREATE INDEX "api_keys_project_id_id_idx" ON "api_keys"("project_id", "id");

-- ==================================================
-- 4. 会话查询优化索引
-- ==================================================

-- 追踪会话表复合索引
CREATE INDEX "trace_sessions_project_created_idx" ON "trace_sessions"("project_id", "created_at");

-- ==================================================
-- 5. 数据集查询优化索引
-- ==================================================

-- 数据集表复合索引
CREATE INDEX "datasets_project_name_idx" ON "datasets"("project_id", "name");

-- 数据集项表复合索引
CREATE INDEX "dataset_items_dataset_created_idx" ON "dataset_items"("dataset_id", "created_at");

-- ==================================================
-- 6. 评估任务优化索引
-- ==================================================

-- 作业配置表复合索引
CREATE INDEX "job_configurations_project_status_idx" ON "job_configurations"("project_id", "status");

-- 作业执行表复合索引
CREATE INDEX "job_executions_project_status_idx" ON "job_executions"("project_id", "status");
CREATE INDEX "job_executions_config_status_idx" ON "job_executions"("job_configuration_id", "status");

-- ==================================================
-- 7. 批量导出优化索引
-- ==================================================

-- 批量导出表复合索引
CREATE INDEX "batch_exports_project_status_idx" ON "batch_exports"("project_id", "status");
CREATE INDEX "batch_exports_status_created_idx" ON "batch_exports"("status", "created_at");

-- ==================================================
-- 8. 任务队列优化索引（如果使用数据库队列）
-- ==================================================

-- 任务队列表复合索引
CREATE INDEX "job_queue_status_queue_created_idx" ON "job_queue"("status", "queue_name", "created_at");
CREATE INDEX "job_queue_queue_status_priority_idx" ON "job_queue"("queue_name", "status", "priority");

-- ==================================================
-- 9. 提示词查询优化索引
-- ==================================================

-- 提示词表复合索引
CREATE INDEX "prompts_project_name_version_idx" ON "prompts"("project_id", "name", "version");
CREATE INDEX "prompts_project_active_idx" ON "prompts"("project_id", "is_active");

-- ==================================================
-- 10. 模型查询优化索引
-- ==================================================

-- 模型表复合索引
CREATE INDEX "models_project_name_start_idx" ON "models"("project_id", "model_name", "start_date");

-- ==================================================
-- 统计信息更新（建议定期执行）
-- ==================================================
-- DM8 使用以下命令更新统计信息
-- CALL SP_STAT_ON_TABLE('schema_name', 'table_name');
-- 或者使用：
-- ANALYZE TABLE table_name COMPUTE STATISTICS;

COMMIT;
