// This file exports the prisma db connection, the Prisma Object, and the Typescript types.
// This is not imported in the index.ts file of this package, as we must not import this into FE code.

import { PrismaClient } from "@prisma/client";
import { env } from "process";
import { getCache, generateCacheKey } from "./cache";
import { getRedisCache, initRedisCache, generateCacheKey as generateRedisCacheKey } from "./redis-cache";

// 根据 DB_TYPE 决定数据库模式
const dbType = env.DB_TYPE || "postgresql";

// 初始化 Redis/TongRDS 缓存（仅在 DM8 模式下，且不在构建阶段）
const isBuildPhase = env.NEXT_PHASE === 'phase-production-build' || env.DOCKER_BUILD === '1';

if (dbType === "dm8" && env.REDIS_HOST && !isBuildPhase) {
  try {
    initRedisCache({
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT || "6379"),
      password: env.REDIS_AUTH || undefined,
      db: parseInt(env.REDIS_DB || "0"),
      keyPrefix: env.REDIS_KEY_PREFIX || "langfuse:",
      defaultTTL: parseInt(env.REDIS_DEFAULT_TTL || "60"),
    });
    console.log("✅ Redis/TongRDS 缓存已初始化");
  } catch (error) {
    console.warn("⚠️ Redis/TongRDS 缓存初始化失败，将使用内存缓存:", error);
  }
}

// ==================== DM8 模式 ====================

let dmdbPool: any = null;

function getDm8Pool() {
  if (dmdbPool) return dmdbPool;

  // 在构建阶段不初始化连接池
  if (isBuildPhase) {
    throw new Error("DM8 pool not available during build phase");
  }

  // 使用 eval 防止 webpack 静态分析打包 dmdb
  const dmdb = eval("require")("dmdb");
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for DM8 mode");
  }
  dmdbPool = dmdb.createPool({
    connectionString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolAlias: 'deeptrace_pool',
  });
  return dmdbPool;
}

/**
 * 将 Prisma.sql 对象转换为原始 SQL + 参数
 */
function prismaSqlToRaw(sqlObj: any): { sql: string; params: any[] } {
  if (!sqlObj || typeof sqlObj !== "object") {
    return { sql: String(sqlObj), params: [] };
  }
  const strings = sqlObj.strings || sqlObj;
  const values = sqlObj.values || [];
  if (!Array.isArray(strings)) {
    return { sql: String(sqlObj), params: [] };
  }
  let sql = "";
  const params: any[] = [];
  for (let i = 0; i < strings.length; i++) {
    sql += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val && typeof val === "object" && val.strings && Array.isArray(val.strings)) {
        const nested = prismaSqlToRaw(val);
        sql += nested.sql;
        params.push(...nested.params);
      } else {
        params.push(val);
        sql += "?";
      }
    }
  }
  return { sql: sql.trim(), params };
}

/**
 * 将 Prisma where 子句转换为 SQL WHERE
 */
function buildWhereClause(where: Record<string, any>, params: any[], paramOffset: number = 0): string {
  if (!where || Object.keys(where).length === 0) return "1=1";

  const conditions: string[] = [];
  let paramIdx = paramOffset;

  for (const [key, value] of Object.entries(where)) {
    const colName = toDm8ColumnName(key);

    if (value === null || value === undefined) {
      if (value === null) conditions.push(`"${colName}" IS NULL`);
      continue;
    }

    if (key === "AND" && Array.isArray(value)) {
      const andParts = value.map((v: any) => buildWhereClause(v, params, paramIdx));
      conditions.push(`(${andParts.join(" AND ")})`);
      continue;
    }
    if (key === "OR" && Array.isArray(value)) {
      const orParts = value.map((v: any) => buildWhereClause(v, params, paramIdx));
      conditions.push(`(${orParts.join(" OR ")})`);
      continue;
    }
    if (key === "NOT") {
      if (Array.isArray(value)) {
        const notParts = value.map((v: any) => buildWhereClause(v, params, paramIdx));
        conditions.push(`NOT (${notParts.join(" AND ")})`);
      } else {
        conditions.push(`NOT (${buildWhereClause(value, params, paramIdx)})`);
      }
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "equals":
            if (opValue === null) { conditions.push(`"${colName}" IS NULL`); }
            else { paramIdx++; conditions.push(`"${colName}" = ?`); params.push(opValue); }
            break;
          case "not":
            if (opValue === null) { conditions.push(`"${colName}" IS NOT NULL`); }
            else if (typeof opValue === "object") {
              // nested operator like { not: { equals: "x" } }
              const subConds = buildWhereClause({ [key]: opValue }, params, paramIdx);
              conditions.push(`NOT (${subConds})`);
            } else { paramIdx++; conditions.push(`"${colName}" != ?`); params.push(opValue); }
            break;
          case "gt": paramIdx++; conditions.push(`"${colName}" > ?`); params.push(opValue); break;
          case "gte": paramIdx++; conditions.push(`"${colName}" >= ?`); params.push(opValue); break;
          case "lt": paramIdx++; conditions.push(`"${colName}" < ?`); params.push(opValue); break;
          case "lte": paramIdx++; conditions.push(`"${colName}" <= ?`); params.push(opValue); break;
          case "contains": paramIdx++; conditions.push(`"${colName}" LIKE ?`); params.push(`%${opValue}%`); break;
          case "startsWith": paramIdx++; conditions.push(`"${colName}" LIKE ?`); params.push(`${opValue}%`); break;
          case "endsWith": paramIdx++; conditions.push(`"${colName}" LIKE ?`); params.push(`%${opValue}`); break;
          case "in":
            if (Array.isArray(opValue) && opValue.length > 0) {
              const placeholders = opValue.map(() => "?").join(", ");
              conditions.push(`"${colName}" IN (${placeholders})`);
              params.push(...opValue);
            } else if (Array.isArray(opValue) && opValue.length === 0) {
              conditions.push("1=0");
            }
            break;
          case "notIn":
            if (Array.isArray(opValue) && opValue.length > 0) {
              const placeholders = opValue.map(() => "?").join(", ");
              conditions.push(`"${colName}" NOT IN (${placeholders})`);
              params.push(...opValue);
            }
            break;
          case "has": paramIdx++; conditions.push(`JSON_CONTAINS("${colName}", ?)`); params.push(JSON.stringify(opValue)); break;
          case "hasSome": /* array overlap */ break;
          case "hasEvery": /* array contains all */ break;
          case "isEmpty":
            if (opValue) conditions.push(`"${colName}" = '[]'`);
            else conditions.push(`"${colName}" != '[]'`);
            break;
          case "mode": break; // prisma mode, skip
          default:
            paramIdx++; conditions.push(`"${colName}" = ?`); params.push(opValue);
        }
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const placeholders = value.map(() => "?").join(", ");
        conditions.push(`"${colName}" IN (${placeholders})`);
        params.push(...value);
      } else {
        conditions.push("1=0");
      }
    } else {
      paramIdx++;
      conditions.push(`"${colName}" = ?`);
      params.push(value);
    }
  }

  return conditions.length > 0 ? conditions.join(" AND ") : "1=1";
}

/**
 * 将 Prisma orderBy 转换为 SQL ORDER BY
 */
function buildOrderClause(orderBy: any): string {
  if (!orderBy) return "";
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];
  for (const order of orders) {
    for (const [key, direction] of Object.entries(order)) {
      // 将 camelCase 转换为 snake_case 并用引号包裹
      const columnName = toDm8ColumnName(key);
      parts.push(`"${columnName}" ${direction === "desc" ? "DESC" : "ASC"}`);
    }
  }
  return parts.join(", ");
}

/**
 * 将 dmdb 结果转换为对象数组
 */
/**
 * 处理 DM8 LOB 对象，将其转换为字符串
 */
function processLobValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // 检查是否是 LOB 对象（dmdb 返回的 LOB 对象有 data 属性）
  if (typeof value === 'object' && value.data !== undefined && value.iLob) {
    // 如果 data 是字符串，直接返回
    if (typeof value.data === 'string') {
      return value.data;
    }
    // 如果 data 是 Buffer，转换为字符串
    if (Buffer.isBuffer(value.data)) {
      return value.data.toString('utf8');
    }
    // 如果 data 是 '[]' 这样的字符串
    if (value.data === '[]') {
      return '[]';
    }
    // 其他情况，尝试读取 LOB 内容
    try {
      // dmdb LOB 对象的 read 方法
      if (typeof value.read === 'function') {
        return value.read();
      }
      // 如果有 toString 方法
      if (typeof value.toString === 'function') {
        return value.toString();
      }
    } catch (e) {
      // 如果读取失败，返回默认值
      return '[]';
    }
  }

  // 处理 dmdb 的 LOB 类型（type: 2017 是 CLOB）
  if (typeof value === 'object' && value.type === 2017 && value.iLob) {
    try {
      // 尝试读取 LOB 内容
      if (value.data && typeof value.data === 'string') {
        return value.data;
      }
      // 如果有 read 方法
      if (typeof value.read === 'function') {
        return value.read();
      }
      // 返回默认值
      return '[]';
    } catch (e) {
      return '[]';
    }
  }

  return value;
}

/**
 * 将 snake_case 转换为 camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function rowsToObjects(result: any): any[] {
  if (!result.rows || !result.metaData) return result.rows || [];
  const columns = result.metaData.map((m: any) => {
    const colName = m.name.toLowerCase();
    return snakeToCamel(colName);
  });
  return result.rows.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, idx: number) => {
      obj[col] = processLobValue(row[idx]);
    });
    return obj;
  });
}

/**
 * Prisma model name -> DM8 table name 映射
 */
const DM8_TABLE_MAP: Record<string, string> = {
  account: "Account",
  session: "Session",
  user: "users",
  verificationToken: "verification_tokens",
  project: "projects",
  apiKey: "api_keys",
  llmApiKeys: "llm_api_keys",
  projectMembership: "project_memberships",
  membershipInvitation: "membership_invitations",
  traceSession: "trace_sessions",
  trace: "traces",
  observation: "observations",
  score: "scores",
  scoreConfig: "score_configs",
  cronJobs: "cron_jobs",
  dataset: "datasets",
  datasetItem: "dataset_items",
  datasetRuns: "dataset_runs",
  datasetRunItems: "dataset_run_items",
  events: "events",
  prompt: "prompts",
  model: "models",
  auditLog: "audit_logs",
  evalTemplate: "eval_templates",
  jobConfiguration: "job_configurations",
  jobExecution: "job_executions",
  ssoConfig: "sso_configs",
  posthogIntegration: "posthog_integrations",
  batchExport: "batch_exports",
};

/**
 * DM8 关系配置
 * 定义模型之间的关联关系
 */
interface RelationConfig {
  table: string;
  fromField: string;
  toField: string;
  type: 'one-to-many' | 'many-to-one' | 'many-to-many';
  nested?: Record<string, RelationConfig>;
}

const DM8_RELATIONS: Record<string, Record<string, RelationConfig>> = {
  trace: {
    observations: {
      table: "observations",
      fromField: "id",
      toField: "trace_id",
      type: "one-to-many",
    },
    scores: {
      table: "scores",
      fromField: "id",
      toField: "trace_id",
      type: "one-to-many",
    },
    session: {
      table: "trace_sessions",
      fromField: "session_id",
      toField: "id",
      type: "many-to-one",
    },
  },
  observation: {
    trace: {
      table: "traces",
      fromField: "trace_id",
      toField: "id",
      type: "many-to-one",
    },
    parent: {
      table: "observations",
      fromField: "parent_observation_id",
      toField: "id",
      type: "many-to-one",
    },
  },
  project: {
    projectMembers: {
      table: "project_memberships",
      fromField: "id",
      toField: "project_id",
      type: "one-to-many",
      nested: {
        user: {
          table: "users",
          fromField: "user_id",
          toField: "id",
          type: "many-to-one",
        },
      },
    },
    projectMemberships: {
      table: "project_memberships",
      fromField: "id",
      toField: "project_id",
      type: "one-to-many",
      nested: {
        user: {
          table: "users",
          fromField: "user_id",
          toField: "id",
          type: "many-to-one",
        },
      },
    },
    traces: {
      table: "traces",
      fromField: "id",
      toField: "project_id",
      type: "one-to-many",
    },
  },
  user: {
    projectMembers: {
      table: "project_memberships",
      fromField: "id",
      toField: "user_id",
      type: "one-to-many",
      nested: {
        project: {
          table: "projects",
          fromField: "project_id",
          toField: "id",
          type: "many-to-one",
        },
      },
    },
    projectMemberships: {
      table: "project_memberships",
      fromField: "id",
      toField: "user_id",
      type: "one-to-many",
      nested: {
        project: {
          table: "projects",
          fromField: "project_id",
          toField: "id",
          type: "many-to-one",
        },
      },
    },
  },
  projectMembership: {
    project: {
      table: "projects",
      fromField: "projectId",
      toField: "id",
      type: "many-to-one",
    },
    user: {
      table: "users",
      fromField: "userId",
      toField: "id",
      type: "many-to-one",
    },
  },
  dataset: {
    datasetItems: {
      table: "dataset_items",
      fromField: "id",
      toField: "dataset_id",
      type: "one-to-many",
    },
    datasetRuns: {
      table: "dataset_runs",
      fromField: "id",
      toField: "dataset_id",
      type: "one-to-many",
    },
  },
  jobConfiguration: {
    jobExecutions: {
      table: "job_executions",
      fromField: "id",
      toField: "job_configuration_id",
      type: "one-to-many",
    },
  },
};

function getDm8TableName(prismaModelName: string): string {
  return DM8_TABLE_MAP[prismaModelName] || prismaModelName;
}

/**
 * Prisma 字段名 -> DM8 列名映射 (camelCase -> snake_case)
 */
function toDm8ColumnName(fieldName: string): string {
  // 特殊映射
  const specialMap: Record<string, string> = {
    emailVerified: "email_verified",
    createdAt: "created_at",
    updatedAt: "updated_at",
    projectId: "project_id",
    userId: "user_id",
    traceId: "trace_id",
    observationId: "observation_id",
    startTime: "start_time",
    endTime: "end_time",
    completionStartTime: "completion_start_time",
    totalCost: "total_cost",
    inputCost: "input_cost",
    outputCost: "output_cost",
    calculatedTotalCost: "calculated_total_cost",
    calculatedInputCost: "calculated_input_cost",
    calculatedOutputCost: "calculated_output_cost",
    promptTokens: "prompt_tokens",
    completionTokens: "completion_tokens",
    totalTokens: "total_tokens",
    inputUsage: "input_usage",
    outputUsage: "output_usage",
    totalUsage: "total_usage",
    modelId: "model_id",
    promptId: "prompt_id",
    parentObservationId: "parent_observation_id",
    publicKey: "public_key",
    hashedSecretKey: "hashed_secret_key",
    fastHashedSecretKey: "fast_hashed_secret_key",
    displaySecretKey: "display_secret_key",
    lastUsedAt: "last_used_at",
    expiresAt: "expires_at",
    datasetId: "dataset_id",
    datasetItemId: "dataset_item_id",
    datasetRunId: "dataset_run_id",
    configId: "config_id",
    templateId: "template_id",
    jobConfigurationId: "job_configuration_id",
    jobExecutionId: "job_execution_id",
    traceSessionId: "trace_session_id",
    sourceTraceId: "source_trace_id",
    sourceObservationId: "source_observation_id",
    nameSecretSalt: "name_secret_salt",
    featureFlags: "feature_flags",
    membershipInvitation: "membership_invitations",
    cloudConfig: "cloud_config",
  };

  if (specialMap[fieldName]) {
    return specialMap[fieldName];
  }

  // 默认转换: camelCase -> snake_case
  return fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * DM8 Model 代理 - 实现 Prisma 风格的 CRUD 操作
 */
function createDm8ModelProxy(poolPromise: any, modelName: string) {
  const tableName = getDm8TableName(modelName);
  const relations = DM8_RELATIONS[modelName] || {};

  /**
   * 解析 include 参数，查询关联数据
   */
  async function resolveIncludes(pool: any, rows: any[], include: any, currentModelName?: string): Promise<any[]> {
    if (!include || Object.keys(include).length === 0) return rows;

    const currentModel = currentModelName || modelName;
    const currentRelations = DM8_RELATIONS[currentModel] || {};


    for (const [relation, includeArgs] of Object.entries(include)) {
      const config = currentRelations[relation];
      if (!config) {
        continue;
      }


      const conn = await pool.getConnection();
      try {
        const ids = rows.map(r => r[config.fromField]).filter(Boolean);
        if (ids.length === 0) {
          continue;
        }

        // 构建查询关联数据的 SQL
        const uniqueIds = [...new Set(ids)];
        const placeholders = uniqueIds.map(() => '?').join(', ');
        const relatedSql = `SELECT * FROM "${config.table}" WHERE "${config.toField}" IN (${placeholders})`;


        const relatedResult = await conn.execute(relatedSql, uniqueIds);
        let relatedRows = rowsToObjects(relatedResult);


        // 如果有嵌套 include，递归处理
        // 需要找到关联表的模型名
        if (typeof includeArgs === 'object' && includeArgs !== null) {
          // 提取实际的 include（可能是 { include: { project: true } } 或 { project: true }）
          let nestedInclude: any = includeArgs;
          if ((includeArgs as any).include) {
            nestedInclude = (includeArgs as any).include;
          }

          // 查找关联表对应的模型名
          const relatedModelName = Object.entries(DM8_TABLE_MAP).find(([_, tableName]) => tableName === config.table)?.[0];
          if (relatedModelName && nestedInclude && typeof nestedInclude === 'object') {
            relatedRows = await resolveIncludes(pool, relatedRows, nestedInclude, relatedModelName);
          }
        }

        // 将关联数据附加到主记录
        // 注意：rows 中的字段名是 camelCase，但 config.toField 是 snake_case
        // 需要将 config.toField 转换为 camelCase 进行比较
        const toFieldCamel = snakeToCamel(config.toField);
        const fromFieldCamel = snakeToCamel(config.fromField);

        rows = rows.map(row => ({
          ...row,
          [relation]: config.type === 'one-to-many'
            ? relatedRows.filter(r => r[toFieldCamel] === row[fromFieldCamel])
            : relatedRows.find(r => r[toFieldCamel] === row[fromFieldCamel]) || null,
        }));
      } finally {
        conn.close();
      }
    }

    return rows;
  }

  /**
   * 应用 select 参数，只返回指定字段
   */
  function applySelect(rows: any[], select: any): any[] {
    if (!select || Object.keys(select).length === 0) return rows;

    const selectedFields = Object.keys(select).filter(key => select[key] === true || select[key] === 1);

    return rows.map(row => {
      const selectedRow: any = {};
      for (const field of selectedFields) {
        if (row[field] !== undefined) {
          selectedRow[field] = row[field];
        }
      }
      return selectedRow;
    });
  }

  return {
    findMany: async (args?: any) => {
      // 检查缓存（只缓存简单查询）
      const hasIncludes = args?.include || (args?.select && Object.values(args.select).some(v => typeof v === 'object'));
      const cacheKey = hasIncludes ? null : generateCacheKey(`findMany:${tableName}`, args);

      // 尝试从 Redis 缓存获取
      if (cacheKey) {
        const redisCache = getRedisCache();
        if (redisCache) {
          const cached = await redisCache.get(cacheKey);
          if (cached) return cached;
        }

        // 尝试从内存缓存获取
        const memoryCache = getCache();
        const memoryCached = memoryCache.get(cacheKey);
        if (memoryCached) return memoryCached;
      }

      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        // 分离简单字段和关系字段
        let selectClause = '*';
        const includeFromSelect: Record<string, any> = {};

        if (args?.select) {
          const simpleFields: string[] = [];
          for (const [key, value] of Object.entries(args.select)) {
            if (value === true || value === 1) {
              // 简单字段
              simpleFields.push(key);
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
              // 关系字段（包含 include 或 select）
              includeFromSelect[key] = value;
            }
          }
          if (simpleFields.length > 0) {
            selectClause = simpleFields.map(f => `"${toDm8ColumnName(f)}"`).join(', ');
          }
        }

        let sql = `SELECT ${selectClause} FROM "${tableName}"`;
        const params: any[] = [];

        if (args?.where) {
          sql += ` WHERE ${buildWhereClause(args.where, params)}`;
        }
        if (args?.orderBy) {
          sql += ` ORDER BY ${buildOrderClause(args.orderBy)}`;
        }
        if (args?.skip !== undefined && args?.take !== undefined) {
          sql += ` OFFSET ${args.skip} ROWS FETCH NEXT ${args.take} ROWS ONLY`;
        } else if (args?.take !== undefined) {
          sql += ` FETCH NEXT ${args.take} ROWS ONLY`;
        }

        const result = await conn.execute(sql, params);
        let rows = rowsToObjects(result);

        // 处理 include（嵌套查询）
        const includes = { ...args?.include, ...includeFromSelect };
        if (Object.keys(includes).length > 0 && rows.length > 0) {
          rows = await resolveIncludes(pool, rows, includes);
        }

        // 缓存结果（只缓存简单查询）
        if (cacheKey && !hasIncludes) {
          // 写入 Redis 缓存（缩短缓存时间以提高响应性）
          const redisCache = getRedisCache();
          if (redisCache) {
            await redisCache.set(cacheKey, rows, 10); // 缓存 10 秒
          }

          // 写入内存缓存
          const memoryCache = getCache();
          memoryCache.set(cacheKey, rows, 5000); // 缓存 5 秒
        }

        return rows;
      } finally {
        conn.close();
      }
    },

    findFirst: async (args?: any) => {
      // 检查缓存（只缓存简单查询）
      const hasIncludes = args?.include || (args?.select && Object.values(args.select).some(v => typeof v === 'object'));
      const cacheKey = hasIncludes ? null : generateCacheKey(`findFirst:${tableName}`, args);

      // 尝试从 Redis 缓存获取
      if (cacheKey) {
        const redisCache = getRedisCache();
        if (redisCache) {
          const cached = await redisCache.get(cacheKey);
          if (cached) return cached;
        }

        // 尝试从内存缓存获取
        const memoryCache = getCache();
        const memoryCached = memoryCache.get(cacheKey);
        if (memoryCached) return memoryCached;
      }

      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        // 分离简单字段和关系字段
        let selectClause = '*';
        const includeFromSelect: Record<string, any> = {};

        if (args?.select) {
          const simpleFields: string[] = [];
          for (const [key, value] of Object.entries(args.select)) {
            if (value === true || value === 1) {
              // 简单字段
              simpleFields.push(key);
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
              // 关系字段（包含 include 或 select）
              includeFromSelect[key] = value;
            }
          }
          if (simpleFields.length > 0) {
            selectClause = simpleFields.map(f => `"${toDm8ColumnName(f)}"`).join(', ');
          }
        }

        let sql = `SELECT ${selectClause} FROM "${tableName}"`;
        const params: any[] = [];

        if (args?.where) {
          sql += ` WHERE ${buildWhereClause(args.where, params)}`;
        }
        if (args?.orderBy) {
          sql += ` ORDER BY ${buildOrderClause(args.orderBy)}`;
        }
        sql += ` FETCH NEXT 1 ROWS ONLY`;

        const result = await conn.execute(sql, params);
        let rows = rowsToObjects(result);

        // 处理 include（嵌套查询）
        const includes = { ...args?.include, ...includeFromSelect };
        if (Object.keys(includes).length > 0 && rows.length > 0) {
          rows = await resolveIncludes(pool, rows, includes);
        }

        const resultRow = rows[0] || null;

        // 缓存结果（只缓存简单查询）
        if (cacheKey && !hasIncludes && resultRow) {
          // 写入 Redis 缓存（缩短缓存时间以提高响应性）
          const redisCache = getRedisCache();
          if (redisCache) {
            await redisCache.set(cacheKey, resultRow, 10); // 缓存 10 秒
          }

          // 写入内存缓存
          const memoryCache = getCache();
          memoryCache.set(cacheKey, resultRow, 5000); // 缓存 5 秒
        }

        return resultRow;
      } finally {
        conn.close();
      }
    },

    findFirstOrThrow: async (args?: any) => {
      const result = await createDm8ModelProxy(poolPromise, modelName).findFirst(args);
      if (!result) throw new Error(`Record not found in ${modelName}`);
      return result;
    },

    findUnique: async (args: any) => {
      const result = await createDm8ModelProxy(poolPromise, modelName).findFirst({
        where: args.where,
        select: args.select,
        include: args.include,
      });
      return result;
    },

    findUniqueOrThrow: async (args: any) => {
      const result = await createDm8ModelProxy(poolPromise, modelName).findUnique(args);
      if (!result) throw new Error(`Record not found in ${modelName}`);
      return result;
    },

    create: async (args: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        const data = args.data;

        // 分离普通字段和嵌套关联
        const simpleData: Record<string, any> = {};
        const nestedCreates: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
          // 检查是否是嵌套创建（包含 create 或 connect 属性）
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            if ('create' in value || 'connect' in value || 'set' in value) {
              // 这是嵌套操作
              nestedCreates[key] = value;
              continue;
            }
          }
          // 普通字段
          simpleData[key] = value;
        }

        // 如果没有 ID 且表有 id 列，生成一个
        // 检查表是否有 id 列（通过查看是否已经有 id 字段或者表名）
        const tablesWithoutId = ['project_memberships', 'verification_tokens'];
        if (!simpleData.id && !tablesWithoutId.includes(tableName)) {
          const { randomUUID } = require('crypto');
          simpleData.id = randomUUID();
        }

        // 插入主记录
        const columns = Object.keys(simpleData);
        const values = Object.values(simpleData);
        const placeholders = columns.map(() => "?").join(", ");

        const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${toDm8ColumnName(c)}"`).join(", ")}) VALUES (${placeholders})`;
        await conn.execute(sql, values);

        // 处理嵌套创建
        for (const [relation, nestedArgs] of Object.entries(nestedCreates)) {
          const relationConfig = relations[relation];
          if (!relationConfig) {
            console.warn(`[DM8] No relation config found for ${modelName}.${relation}`);
            continue;
          }

          // 处理 create 操作
          if (nestedArgs.create) {
            const nestedData = nestedArgs.create;
            // 获取主记录的 ID（可能是 id 或复合主键的一部分）
            const mainId = simpleData.id || simpleData[relationConfig.fromField];

            // 构建嵌套记录数据
            const nestedRecords = Array.isArray(nestedData) ? nestedData : [nestedData];
            for (const record of nestedRecords) {
              // 分离嵌套记录中的普通字段和关联
              const nestedSimpleData: Record<string, any> = {};
              for (const [k, v] of Object.entries(record)) {
                if (v && typeof v === 'object' && !Array.isArray(v) && ('create' in v || 'connect' in v)) {
                  // 跳过嵌套关联
                  continue;
                }
                nestedSimpleData[k] = v;
              }

              // 如果没有 ID 且表有 id 列，生成一个
              const nestedTable = relationConfig.table;
              if (!nestedSimpleData.id && !tablesWithoutId.includes(nestedTable)) {
                const { randomUUID } = require('crypto');
                nestedSimpleData.id = randomUUID();
              }

              const nestedColumns = Object.keys(nestedSimpleData);
              const nestedValues = Object.values(nestedSimpleData);

              // 添加外键
              const fkColumn = relationConfig.toField;
              const fkValue = mainId;

              const allColumns = [...nestedColumns, fkColumn];
              const allValues = [...nestedValues, fkValue];
              const allPlaceholders = allColumns.map(() => "?").join(", ");

              const nestedSql = `INSERT INTO "${nestedTable}" (${allColumns.map(c => `"${toDm8ColumnName(c)}"`).join(", ")}) VALUES (${allPlaceholders})`;
              await conn.execute(nestedSql, allValues);
            }
          }
        }

        // 返回创建的记录
        if (simpleData.id) {
          const selectResult = await conn.execute(
            `SELECT * FROM "${tableName}" WHERE "id" = ?`,
            [simpleData.id]
          );
          const rows = rowsToObjects(selectResult);
          return rows[0] || simpleData;
        } else {
          // 对于复合主键的表，返回简单数据
          return simpleData;
        }
      } finally {
        conn.close();
      }
    },

    createMany: async (args: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        let count = 0;
        for (const item of args.data) {
          const columns = Object.keys(item);
          const values = Object.values(item);
          const placeholders = columns.map(() => "?").join(", ");
          const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;
          await conn.execute(sql, values);
          count++;
        }
        return { count };
      } finally {
        conn.close();
      }
    },

    update: async (args: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        const { data, where } = args;
        const setClauses: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
          setClauses.push(`"${key}" = ?`);
          params.push(value);
        }

        const whereClause = buildWhereClause(where, params, params.length);
        const sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")} WHERE ${whereClause}`;
        await conn.execute(sql, params);

        // 返回更新后的记录
        if (where.id) {
          const selectResult = await conn.execute(
            `SELECT * FROM "${tableName}" WHERE "id" = ?`,
            [where.id]
          );
          const rows = rowsToObjects(selectResult);
          return rows[0] || data;
        }
        return data;
      } finally {
        conn.close();
      }
    },

    updateMany: async (args: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        const { data, where } = args;
        const setClauses: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
          setClauses.push(`"${key}" = ?`);
          params.push(value);
        }

        let sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")}`;
        if (where) {
          sql += ` WHERE ${buildWhereClause(where, params, params.length)}`;
        }

        const result = await conn.execute(sql, params);
        return { count: result.rowsAffected || 0 };
      } finally {
        conn.close();
      }
    },

    upsert: async (args: any) => {
      const existing = await createDm8ModelProxy(poolPromise, modelName).findFirst({ where: args.where });
      if (existing) {
        return createDm8ModelProxy(poolPromise, modelName).update({ where: args.where, data: args.update });
      } else {
        return createDm8ModelProxy(poolPromise, modelName).create({ data: args.create });
      }
    },

    delete: async (args: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        // 先查询要删除的记录
        const selectParams: any[] = [];
        const selectWhereClause = buildWhereClause(args.where, selectParams);
        const selectResult = await conn.execute(
          `SELECT * FROM "${tableName}" WHERE ${selectWhereClause}`,
          selectParams
        );
        const rows = rowsToObjects(selectResult);
        const record = rows[0];

        // 删除
        const deleteParams: any[] = [];
        const deleteWhereClause = buildWhereClause(args.where, deleteParams);
        await conn.execute(`DELETE FROM "${tableName}" WHERE ${deleteWhereClause}`, deleteParams);

        return record;
      } finally {
        conn.close();
      }
    },

    deleteMany: async (args?: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        let sql = `DELETE FROM "${tableName}"`;
        const params: any[] = [];

        if (args?.where) {
          sql += ` WHERE ${buildWhereClause(args.where, params)}`;
        }

        const result = await conn.execute(sql, params);
        return { count: result.rowsAffected || 0 };
      } finally {
        conn.close();
      }
    },

    count: async (args?: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        let sql = `SELECT COUNT(*) as cnt FROM "${tableName}"`;
        const params: any[] = [];

        if (args?.where) {
          sql += ` WHERE ${buildWhereClause(args.where, params)}`;
        }

        const result = await conn.execute(sql, params);
        return result.rows?.[0]?.[0] || 0;
      } finally {
        conn.close();
      }
    },

    groupBy: async (args: any) => {
      const pool = await poolPromise;
      const conn = await pool.getConnection();
      try {
        // 构建 GROUP BY 子句
        const groupByFields = args.by || [];
        const selectFields = [...groupByFields];

        // 处理聚合函数
        if (args._count) {
          for (const [field, options] of Object.entries(args._count)) {
            if (options === true || (options as any)?._all) {
              selectFields.push(`COUNT(*) as "_count.${field}._all"`);
            } else {
              selectFields.push(`COUNT("${toDm8ColumnName(field)}") as "_count.${field}"`);
            }
          }
        }

        if (args._sum) {
          for (const [field, options] of Object.entries(args._sum)) {
            if (options === true) {
              selectFields.push(`SUM("${toDm8ColumnName(field)}") as "_sum.${field}"`);
            }
          }
        }

        if (args._avg) {
          for (const [field, options] of Object.entries(args._avg)) {
            if (options === true) {
              selectFields.push(`AVG("${toDm8ColumnName(field)}") as "_avg.${field}"`);
            }
          }
        }

        if (args._min) {
          for (const [field, options] of Object.entries(args._min)) {
            if (options === true) {
              selectFields.push(`MIN("${toDm8ColumnName(field)}") as "_min.${field}"`);
            }
          }
        }

        if (args._max) {
          for (const [field, options] of Object.entries(args._max)) {
            if (options === true) {
              selectFields.push(`MAX("${toDm8ColumnName(field)}") as "_max.${field}"`);
            }
          }
        }

        // 构建 SQL
        let sql = `SELECT ${selectFields.map((f: string) => {
          if (f.includes(' as ')) return f;
          return `"${toDm8ColumnName(f)}"`;
        }).join(', ')} FROM "${tableName}"`;

        const params: any[] = [];

        // WHERE 子句
        if (args.where) {
          sql += ` WHERE ${buildWhereClause(args.where, params)}`;
        }

        // GROUP BY 子句
        if (groupByFields.length > 0) {
          sql += ` GROUP BY ${groupByFields.map((f: string) => `"${toDm8ColumnName(f)}"`).join(', ')}`;
        }

        // HAVING 子句
        if (args.having) {
          sql += ` HAVING ${buildWhereClause(args.having, params)}`;
        }

        // ORDER BY 子句
        if (args.orderBy) {
          const orderClauses = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
          const orderParts: string[] = [];
          for (const order of orderClauses) {
            for (const [key, direction] of Object.entries(order)) {
              // 处理 _count 排序
              if (key === '_count' && typeof direction === 'object') {
                for (const [countField, countDir] of Object.entries(direction as any)) {
                  orderParts.push(`COUNT("${toDm8ColumnName(countField)}") ${countDir === "desc" ? "DESC" : "ASC"}`);
                }
              } else {
                orderParts.push(`"${toDm8ColumnName(key)}" ${direction === "desc" ? "DESC" : "ASC"}`);
              }
            }
          }
          if (orderParts.length > 0) {
            sql += ` ORDER BY ${orderParts.join(', ')}`;
          }
        }

        // LIMIT 和 OFFSET
        if (args.take !== undefined) {
          sql += ` FETCH NEXT ${args.take} ROWS ONLY`;
        }
        if (args.skip !== undefined) {
          sql += ` OFFSET ${args.skip} ROWS`;
        }

        const result = await conn.execute(sql, params);
        const rows = rowsToObjects(result);

        // 后处理：将 _count.xxx 转换为嵌套对象
        if (args._count) {
          for (const row of rows) {
            const countObj: any = {};
            for (const key of Object.keys(row)) {
              if (key.startsWith('_count.')) {
                const parts = key.split('.');
                if (parts.length === 3) {
                  // _count.field._all
                  if (!countObj[parts[1]]) countObj[parts[1]] = {};
                  countObj[parts[1]][parts[2]] = row[key];
                } else if (parts.length === 2) {
                  // _count.field
                  countObj[parts[1]] = row[key];
                }
                delete row[key];
              }
            }
            if (Object.keys(countObj).length > 0) {
              row._count = countObj;
            }
          }
        }

        return rows;
      } finally {
        conn.close();
      }
    },

    aggregate: async (args: any) => {
      throw new Error(`[DM8] aggregate on "${tableName}" is not yet supported`);
    },
  };
}

/**
 * DM8 模式的 PrismaClient 代理
 */
function createDm8PrismaProxy(): PrismaClient {
  const pool = getDm8Pool();

  const proxy: any = {
    $queryRaw: async (sqlObj: any) => {
      const resolvedPool = await pool;
      const conn = await resolvedPool.getConnection();
      try {
        const { sql, params } = prismaSqlToRaw(sqlObj);
        const result = await conn.execute(sql, params);
        return rowsToObjects(result);
      } finally {
        conn.close();
      }
    },

    $executeRaw: async (sqlObj: any) => {
      const resolvedPool = await pool;
      const conn = await resolvedPool.getConnection();
      try {
        const { sql, params } = prismaSqlToRaw(sqlObj);
        const result = await conn.execute(sql, params);
        return result.rowsAffected || 0;
      } finally {
        conn.close();
      }
    },

    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      const resolvedPool = await pool;
      const conn = await resolvedPool.getConnection();
      try {
        const result = await conn.execute(sql, params);
        return rowsToObjects(result);
      } finally {
        conn.close();
      }
    },

    $executeRawUnsafe: async (sql: string, ...params: any[]) => {
      const resolvedPool = await pool;
      const conn = await resolvedPool.getConnection();
      try {
        const result = await conn.execute(sql, params);
        return result.rowsAffected || 0;
      } finally {
        conn.close();
      }
    },

    $transaction: async (fn: any) => {
      const resolvedPool = await pool;
      const conn = await resolvedPool.getConnection();
      try {
        await conn.execute("BEGIN TRANSACTION");
        const result = await fn(proxy);
        await conn.execute("COMMIT");
        return result;
      } catch (error) {
        await conn.execute("ROLLBACK");
        throw error;
      } finally {
        conn.close();
      }
    },

    $connect: async () => {},
    $disconnect: async () => {
      const resolvedPool = await pool;
      if (resolvedPool?.close) await resolvedPool.close();
      dmdbPool = null;
    },
  };

  // 添加 model 代理
  const modelNames = [
    "account", "session", "user", "verificationToken", "project", "apiKey",
    "llmApiKeys", "projectMembership", "membershipInvitation", "traceSession",
    "trace", "observation", "score", "scoreConfig", "cronJobs", "dataset",
    "datasetItem", "datasetRuns", "datasetRunItems", "events", "prompt",
    "model", "auditLog", "evalTemplate", "jobConfiguration", "jobExecution",
    "ssoConfig", "posthogIntegration", "batchExport",
  ];

  for (const modelName of modelNames) {
    proxy[modelName] = createDm8ModelProxy(pool, modelName);
  }

  return proxy as PrismaClient;
}

// ==================== PostgreSQL 模式 ====================

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof createDm8PrismaProxy> | PrismaClient;
  var kyselyPrisma: undefined | any;
}

// Always export Prisma types for TypeScript annotations
export * from "@prisma/client";

// 延迟初始化 prisma 实例，避免在构建阶段初始化 DM8 连接池
let _prisma: PrismaClient | null = null;
let _kyselyPrisma: any = null;

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  if (dbType === "dm8") {
    _prisma = (globalThis.prisma as PrismaClient) ?? createDm8PrismaProxy();
    _kyselyPrisma = _prisma;
  } else {
    const prismaClientSingleton = () => {
      return new PrismaClient({
        log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error", "warn"],
      });
    };

    let kyselySingleton: ((pc: PrismaClient) => any) | null = null;
    try {
      const kyselyExt = require("prisma-extension-kysely").default;
      const { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } = require("kysely");
      kyselySingleton = (pc: PrismaClient) => pc.$extends(
        kyselyExt({
          kysely: (driver: any) => new Kysely({
            dialect: {
              createDriver: () => driver,
              createAdapter: () => new PostgresAdapter(),
              createIntrospector: (db: any) => new PostgresIntrospector(db),
              createQueryCompiler: () => new PostgresQueryCompiler(),
            },
          }),
        })
      );
    } catch {}

    _prisma = globalThis.prisma ?? prismaClientSingleton();
    _kyselyPrisma = globalThis.kyselyPrisma ?? (kyselySingleton ? kyselySingleton(_prisma) : _prisma);
  }

  return _prisma;
}

function getKyselyPrisma(): any {
  if (!_prisma) getPrisma();
  return _kyselyPrisma;
}

// 导出 getter 函数而不是直接导出变量
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  }
});

export const kyselyPrisma = new Proxy({} as any, {
  get(_target, prop) {
    return (getKyselyPrisma() as any)[prop];
  }
});

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
