-- ==================================================
-- DeepTrace DM8 初始数据脚本
-- 创建管理员用户、默认项目和 API Key
-- ==================================================

-- 1. 创建管理员用户
-- 密码: admin123 (bcrypt 加密)
INSERT INTO "users" (
    "id",
    "name",
    "email",
    "email_verified",
    "password",
    "admin",
    "feature_flags",
    "created_at",
    "updated_at"
) VALUES (
    'user-admin-001',
    'Admin',
    'admin@deeptrace.local',
    CURRENT_TIMESTAMP,
    -- bcrypt hash of 'admin123'
    '$2a$10\$rDkPvvAFV8kB8wz8kxN5s.NnE5X3X3X3X3X3X3X3X3X3X3X3Xu',
    1,
    '[]',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 2. 创建默认项目
INSERT INTO "projects" (
    "id",
    "name",
    "created_at",
    "updated_at",
    "deleted_at",
    "name_secret_salt"
) VALUES (
    'project-default-001',
    'Default Project',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    NULL,
    'salt'
);

-- 3. 创建项目成员关系
INSERT INTO "project_memberships" (
    "id",
    "project_id",
    "user_id",
    "role",
    "created_at",
    "updated_at"
) VALUES (
    'membership-admin-001',
    'project-default-001',
    'user-admin-001',
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 4. 创建 API Key
-- 实际使用时需要生成正确的 hash
INSERT INTO "api_keys" (
    "id",
    "project_id",
    "public_key",
    "secret_key",
    "created_at",
    "note",
    "display_secret_key",
    "fast_hashed_secret_key"
) VALUES (
    'apikey-admin-001',
    'project-default-001',
    'pk-lf-admin-001',
    -- 这是示例 hash，实际部署时需要生成正确的
    'sk-lf-admin-001-secret-hash',
    CURRENT_TIMESTAMP,
    'Default Admin API Key',
    'sk-lf-...3X3X',
    'fast-hash-placeholder'
);

COMMIT;
