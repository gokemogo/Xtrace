/**
 * SQL Dialect Compatibility Layer
 *
 * 处理 PostgreSQL 和 DM8 之间的 SQL 语法差异
 */

import type { DbType } from "./interface";

// ==================== 类型映射 ====================

/**
 * PostgreSQL 类型到 DM8 类型的映射
 */
export function dm8TypeMap(pgType: string): string {
  const typeMap: Record<string, string> = {
    // 字符串类型
    text: "VARCHAR2(4000)",
    varchar: "VARCHAR2",
    char: "CHAR",
    "character varying": "VARCHAR2",
    "character": "CHAR",

    // 数字类型
    integer: "INTEGER",
    int: "INTEGER",
    int4: "INTEGER",
    bigint: "BIGINT",
    int8: "BIGINT",
    smallint: "SMALLINT",
    int2: "SMALLINT",
    decimal: "DECIMAL",
    numeric: "NUMERIC",
    real: "FLOAT",
    float4: "FLOAT",
    "double precision": "DOUBLE",
    float8: "DOUBLE",

    // 日期时间类型
    timestamp: "TIMESTAMP",
    "timestamp without time zone": "TIMESTAMP",
    "timestamp with time zone": "TIMESTAMP WITH TIME ZONE",
    timestamptz: "TIMESTAMP WITH TIME ZONE",
    date: "DATE",
    time: "TIME",
    "time without time zone": "TIME",
    "time with time zone": "TIME WITH TIME ZONE",

    // 布尔类型（DM8 用 INT 表示）
    boolean: "INTEGER",
    bool: "INTEGER",

    // UUID（DM8 用 VARCHAR2 存储）
    uuid: "VARCHAR2(36)",

    // JSON 类型（DM8 用 CLOB/TEXT 存储）
    json: "CLOB",
    jsonb: "CLOB",

    // 数组类型（DM8 无数组，用 CLOB 存储 JSON）
    "text[]": "CLOB",
    "integer[]": "CLOB",
    "varchar[]": "CLOB",

    // 二进制类型
    bytea: "BLOB",

    // 枚举类型（DM8 用 VARCHAR2 + CHECK 约束）
    // 枚举类型名会被转换为 VARCHAR2
  };

  // 如果是枚举类型名（不在映射中），返回 VARCHAR2
  return typeMap[pgType.toLowerCase()] || "VARCHAR2(255)";
}

// ==================== SQL 函数差异 ====================

/**
 * ILIKE 操作符
 * PostgreSQL: column ILIKE '%value%'
 * DM8: column LIKE '%value%' (DM8 默认大小写不敏感)
 */
export function ilike(column: string, paramPlaceholder: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${column} ILIKE ${paramPlaceholder}`;
  }
  // DM8 默认大小写不敏感，直接使用 LIKE
  return `${column} LIKE ${paramPlaceholder}`;
}

/**
 * jsonb_object_agg 函数
 * PostgreSQL: jsonb_object_agg(key, value)
 * DM8: JSON_OBJECTAGG(key VALUE value) 或自定义实现
 */
export function jsonbObjectAgg(keyExpr: string, valueExpr: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `jsonb_object_agg(${keyExpr}, ${valueExpr})`;
  }
  // DM8 的 JSON_OBJECTAGG 语法
  return `JSON_OBJECTAGG(${keyExpr} VALUE ${valueExpr})`;
}

/**
 * json_build_object 函数
 * PostgreSQL: json_build_object('key1', val1, 'key2', val2)
 * DM8: JSON_OBJECT('key1' VALUE val1, 'key2' VALUE val2)
 */
export function jsonBuildObject(args: string[], dbType: DbType): string {
  if (dbType === "postgresql") {
    return `json_build_object(${args.join(", ")})`;
  }
  // DM8 的 JSON_OBJECT 语法
  return `JSON_OBJECT(${args.join(", ")})`;
}

/**
 * json_agg 函数
 * PostgreSQL: json_agg(expr)
 * DM8: JSON_ARRAYAGG(expr)
 */
export function jsonAgg(expr: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `json_agg(${expr})`;
  }
  return `JSON_ARRAYAGG(${expr})`;
}

/**
 * ARRAY[] 字面量
 * PostgreSQL: ARRAY['a', 'b', 'c']
 * DM8: 需要使用其他方式（如 JSON 数组或临时表）
 */
export function arrayLiteral(values: string[], dbType: DbType): string {
  if (dbType === "postgresql") {
    return `ARRAY[${values.join(", ")}]`;
  }
  // DM8 使用 JSON 数组
  return `JSON_ARRAY(${values.join(", ")})`;
}

/**
 * 类型转换
 * PostgreSQL: expression::type
 * DM8: CAST(expression AS type)
 */
export function typeCast(expr: string, type: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${expr}::${type}`;
  }
  return `CAST(${expr} AS ${dm8TypeMap(type)})`;
}

/**
 * 类型转换（带参数化占位符）
 * PostgreSQL: $1::type
 * DM8: CAST($1 AS type)
 */
export function paramTypeCast(paramPlaceholder: string, type: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${paramPlaceholder}::${type}`;
  }
  return `CAST(${paramPlaceholder} AS ${dm8TypeMap(type)})`;
}

/**
 * ARRAY_AGG 聚合函数
 * PostgreSQL: array_agg(expr)
 * DM8: LISTAGG(expr, ',') 或 JSON_ARRAYAGG(expr)
 */
export function arrayAgg(expr: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `array_agg(${expr})`;
  }
  // DM8 使用 JSON_ARRAYAGG
  return `JSON_ARRAYAGG(${expr})`;
}

/**
 * ARRAY_AGG 带 FILTER 子句
 * PostgreSQL: array_agg(expr) FILTER (WHERE condition)
 * DM8: 需要使用 CASE WHEN 实现
 */
export function arrayAggFilter(expr: string, filterCondition: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `array_agg(${expr}) FILTER (WHERE ${filterCondition})`;
  }
  // DM8 使用 CASE WHEN
  return `JSON_ARRAYAGG(CASE WHEN ${filterCondition} THEN ${expr} END)`;
}

/**
 * 数组包含操作 @>
 * PostgreSQL: array_column @> ARRAY['value']
 * DM8: JSON_CONTAINS(array_column, 'value')
 */
export function arrayContains(column: string, value: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${column} @> ${value}`;
  }
  // DM8 使用 JSON_CONTAINS 或 LIKE
  return `JSON_CONTAINS(${column}, ${value})`;
}

/**
 * 数组重叠操作 &&
 * PostgreSQL: array_column && ARRAY['value1', 'value2']
 * DM8: 需要使用 JSON_OVERLAPS 或自定义函数
 */
export function arrayOverlaps(column: string, values: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${column} && ${values}`;
  }
  // DM8 使用 JSON_OVERLAPS（如果支持）或 EXISTS + JSON_TABLE
  return `JSON_OVERLAPS(${column}, ${values})`;
}

/**
 * UNNEST 函数
 * PostgreSQL: UNNEST(array_column)
 * DM8: JSON_TABLE(array_column, '$[*]' COLUMNS (...))
 */
export function unnest(column: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `UNNEST(${column})`;
  }
  // DM8 使用 JSON_TABLE
  return `JSON_TABLE(${column}, '$[*]' COLUMNS (value VARCHAR2(4000) PATH '$'))`;
}

/**
 * LEFT JOIN LATERAL
 * PostgreSQL: LEFT JOIN LATERAL (subquery) AS alias ON true
 * DM8: 需要转换为普通 JOIN 或子查询
 */
export function leftJoinLateral(subquery: string, alias: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `LEFT JOIN LATERAL (${subquery}) AS ${alias} ON true`;
  }
  // DM8 不支持 LATERAL，需要转换为其他方式
  // 这里返回占位符，实际使用时需要根据具体查询重写
  throw new Error("LEFT JOIN LATERAL is not supported in DM8. Please rewrite the query.");
}

/**
 * EXTRACT(EPOCH FROM interval)
 * PostgreSQL: EXTRACT(EPOCH FROM (now() - timestamp_column))
 * DM8: DATEDIFF(SECOND, timestamp_column, SYSDATE)
 */
export function extractEpoch(fromExpr: string, toExpr: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `EXTRACT(EPOCH FROM (${toExpr} - ${fromExpr}))`;
  }
  // DM8 使用 DATEDIFF
  return `DATEDIFF(SECOND, ${fromExpr}, ${toExpr})`;
}

/**
 * DATE_TRUNC 函数
 * PostgreSQL: DATE_TRUNC('day', timestamp_column)
 * DM8: TRUNC(timestamp_column, 'DD')
 */
export function dateTrunc(precision: string, expr: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `DATE_TRUNC('${precision}', ${expr})`;
  }
  // DM8 使用 TRUNC
  const dm8Precision: Record<string, string> = {
    day: "DD",
    month: "MM",
    year: "YYYY",
    hour: "HH24",
    minute: "MI",
    second: "SS",
    week: "IW",
    quarter: "Q",
  };
  return `TRUNC(${expr}, '${dm8Precision[precision] || precision}')`;
}

/**
 * LOCK TABLE 语句
 * PostgreSQL: LOCK TABLE table IN SHARE ROW EXCLUSIVE MODE
 * DM8: LOCK TABLE table IN SHARE MODE
 */
export function lockTable(table: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`;
  }
  // DM8 使用 SHARE MODE
  return `LOCK TABLE ${table} IN SHARE MODE`;
}

/**
 * ON CONFLICT DO UPDATE (Upsert)
 * PostgreSQL: INSERT INTO ... ON CONFLICT (columns) DO UPDATE SET ...
 * DM8: MERGE INTO ... USING ... ON ... WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT
 */
export function onConflictDoUpdate(
  table: string,
  conflictColumns: string[],
  insertColumns: string[],
  insertValues: string[],
  updateSetClauses: string[],
  dbType: DbType
): string {
  if (dbType === "postgresql") {
    return `INSERT INTO ${table} (${insertColumns.join(", ")})
VALUES (${insertValues.join(", ")})
ON CONFLICT (${conflictColumns.join(", ")})
DO UPDATE SET ${updateSetClauses.join(", ")}`;
  }

  // DM8 使用 MERGE INTO
  const mergeCondition = conflictColumns.map((col) => `target.${col} = source.${col}`).join(" AND ");
  const insertCols = insertColumns.join(", ");
  const insertVals = insertValues.map((v) => `source.${v}`).join(", ");
  const updateSet = updateSetClauses.join(", ");

  return `MERGE INTO ${table} target
USING (SELECT ${insertValues.map((v, i) => `${v} AS ${insertColumns[i]}`).join(", ")}) source
ON ${mergeCondition}
WHEN MATCHED THEN UPDATE SET ${updateSet}
WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})`;
}

/**
 * NOW() 函数
 * PostgreSQL: NOW()
 * DM8: SYSDATE 或 CURRENT_TIMESTAMP
 */
export function now(dbType: DbType): string {
  if (dbType === "postgresql") {
    return "NOW()";
  }
  return "SYSDATE";
}

/**
 * INTERVAL 语法
 * PostgreSQL: NOW() - INTERVAL '1 day'
 * DM8: SYSDATE - 1
 */
export function interval(value: string, unit: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `INTERVAL '${value} ${unit}'`;
  }
  // DM8 直接使用数字
  const unitMap: Record<string, string> = {
    day: "DD",
    month: "MM",
    year: "YYYY",
    hour: "HH24",
    minute: "MI",
    second: "SS",
  };
  return `${value} * (1 ${unitMap[unit] || unit})`;
}

/**
 * 生成随机 UUID
 * PostgreSQL: gen_random_uuid()
 * DM8: SYS_GUID() 或自定义函数
 */
export function genRandomUuid(dbType: DbType): string {
  if (dbType === "postgresql") {
    return "gen_random_uuid()";
  }
  return "SYS_GUID()";
}

/**
 * 正则表达式匹配
 * PostgreSQL: column ~ 'regex'
 * DM8: REGEXP_LIKE(column, 'regex')
 */
export function regexMatch(column: string, pattern: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${column} ~ ${pattern}`;
  }
  return `REGEXP_LIKE(${column}, ${pattern})`;
}

/**
 * pg_database_size 函数
 * PostgreSQL: pg_database_size(database_name)
 * DM8: 需要使用其他方式获取数据库大小
 */
export function databaseSize(dbName: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `pg_database_size('${dbName}')`;
  }
  // DM8 需要查询系统视图
  return `(SELECT SUM(bytes) FROM DBA_SEGMENTS WHERE tablespace_name = '${dbName}')`;
}

/**
 * 字符串连接
 * PostgreSQL: string1 || string2
 * DM8: CONCAT(string1, string2) 或 string1 || string2
 */
export function concat(args: string[], dbType: DbType): string {
  if (dbType === "postgresql") {
    return args.join(" || ");
  }
  // DM8 也支持 || 操作符，但使用 CONCAT 更安全
  return `CONCAT(${args.join(", ")})`;
}

/**
 * COALESCE 函数（两个数据库都支持）
 */
export function coalesce(...args: string[]): string {
  return `COALESCE(${args.join(", ")})`;
}

/**
 * CASE WHEN 表达式（两个数据库都支持）
 */
export function caseWhen(conditions: { when: string; then: string }[], elseExpr?: string): string {
  const parts = conditions.map((c) => `WHEN ${c.when} THEN ${c.then}`);
  if (elseExpr) {
    parts.push(`ELSE ${elseExpr}`);
  }
  return `CASE ${parts.join(" ")} END`;
}

/**
 * LIMIT/OFFSET 子句
 * PostgreSQL: LIMIT n OFFSET m
 * DM8: OFFSET m ROWS FETCH NEXT n ROWS ONLY
 */
export function limitOffset(limit: number | undefined, offset: number | undefined, dbType: DbType): string {
  if (dbType === "postgresql") {
    let clause = "";
    if (limit !== undefined) {
      clause += `LIMIT ${limit}`;
    }
    if (offset !== undefined) {
      clause += ` OFFSET ${offset}`;
    }
    return clause;
  }

  // DM8 使用 OFFSET FETCH
  let clause = "";
  if (offset !== undefined) {
    clause += `OFFSET ${offset} ROWS`;
  }
  if (limit !== undefined) {
    clause += ` FETCH NEXT ${limit} ROWS ONLY`;
  }
  return clause;
}

/**
 * ANY 操作符
 * PostgreSQL: value = ANY(array)
 * DM8: value IN (SELECT ...) 或 JSON_CONTAINS
 */
export function anyOperator(column: string, arrayExpr: string, dbType: DbType): string {
  if (dbType === "postgresql") {
    return `${column} = ANY(${arrayExpr})`;
  }
  // DM8 使用 IN 或 JSON_CONTAINS
  return `${column} IN (SELECT value FROM JSON_TABLE(${arrayExpr}, '$[*]' COLUMNS (value VARCHAR2(4000) PATH '$')))`;
}
