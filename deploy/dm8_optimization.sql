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
