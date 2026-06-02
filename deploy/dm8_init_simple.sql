-- DeepTrace DM8 简化初始化脚本
-- 只包含核心表结构

-- 用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200),
    "email" VARCHAR(200),
    "email_verified" TIMESTAMP,
    "password" VARCHAR(200),
    "image" VARCHAR(2000),
    "admin" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 项目表
CREATE TABLE IF NOT EXISTS "projects" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "cloud_config" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS "project_memberships" (
    "project_id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("project_id", "user_id")
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
    "public" BOOLEAN DEFAULT FALSE,
    "bookmark" BOOLEAN DEFAULT FALSE,
    "session_id" VARCHAR(100),
    "tags" TEXT DEFAULT '[]',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- 观测表
CREATE TABLE IF NOT EXISTS "observations" (
    "id" VARCHAR(100) NOT NULL,
    "trace_id" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200),
    "start_time" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP,
    "metadata" TEXT,
    "model" VARCHAR(200),
    "model_parameters" TEXT,
    "input" TEXT,
    "output" TEXT,
    "level" VARCHAR(50) DEFAULT 'DEFAULT',
    "status_message" VARCHAR(2000),
    "parent_observation_id" VARCHAR(100),
    "version" VARCHAR(100),
    "project_id" VARCHAR(100) NOT NULL,
    "prompt_tokens" INTEGER DEFAULT 0,
    "completion_tokens" INTEGER DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "unit" VARCHAR(50),
    "input_cost" DECIMAL(20,10),
    "output_cost" DECIMAL(20,10),
    "total_cost" DECIMAL(20,10),
    "calculated_input_cost" DECIMAL(20,10),
    "calculated_output_cost" DECIMAL(20,10),
    "calculated_total_cost" DECIMAL(20,10),
    "completion_start_time" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- 评分表
CREATE TABLE IF NOT EXISTS "scores" (
    "id" VARCHAR(100) NOT NULL,
    "trace_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "value" DECIMAL(20,10),
    "source" VARCHAR(50) NOT NULL,
    "comment" TEXT,
    "author_user_id" VARCHAR(100),
    "config_id" VARCHAR(100),
    "string_value" VARCHAR(2000),
    "data_type" VARCHAR(50) DEFAULT 'NUMERIC',
    "project_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- API 密钥表
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" VARCHAR(100) NOT NULL,
    "project_id" VARCHAR(100),
    "public_key" VARCHAR(100) NOT NULL,
    "hashed_secret_key" VARCHAR(200) NOT NULL,
    "fast_hashed_secret_key" VARCHAR(200),
    "display_secret_key" VARCHAR(200) NOT NULL,
    "note" VARCHAR(200),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP,
    "last_used_at" TIMESTAMP,
    "scope" VARCHAR(50) DEFAULT 'PROJECT',
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- 任务队列表
CREATE TABLE IF NOT EXISTS "job_queue" (
    "id" VARCHAR(100) NOT NULL,
    "queue_name" VARCHAR(100) NOT NULL,
    "job_name" VARCHAR(200) NOT NULL,
    "payload" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "delay_until" TIMESTAMP,
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "failed_at" TIMESTAMP,
    "error" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "traces_project_id_idx" ON "traces"("project_id");
CREATE INDEX IF NOT EXISTS "traces_timestamp_idx" ON "traces"("timestamp");
CREATE INDEX IF NOT EXISTS "observations_trace_id_idx" ON "observations"("trace_id");
CREATE INDEX IF NOT EXISTS "observations_project_id_idx" ON "observations"("project_id");
CREATE INDEX IF NOT EXISTS "scores_trace_id_idx" ON "scores"("trace_id");
CREATE INDEX IF NOT EXISTS "scores_project_id_idx" ON "scores"("project_id");
CREATE INDEX IF NOT EXISTS "api_keys_project_id_idx" ON "api_keys"("project_id");
CREATE INDEX IF NOT EXISTS "job_queue_status_idx" ON "job_queue"("status");
CREATE INDEX IF NOT EXISTS "job_queue_queue_name_idx" ON "job_queue"("queue_name");
