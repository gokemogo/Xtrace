/**
 * DM8 Adapter for 达梦数据库
 *
 * 使用 dmdb 原生驱动实现 IDatabaseAdapter 接口
 */

import type {
  IDatabaseAdapter,
  IModelAdapter,
  FindManyArgs,
  FindFirstArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
  CountArgs,
  GroupByArgs,
  AggregateArgs,
} from "./interface";

// dmdb 类型声明（因为 npm 包可能没有完整的类型定义）
let dmdb: any;

try {
  // 使用 eval 防止 webpack 静态分析打包 dmdb
  dmdb = eval("require")("dmdb");
} catch {
  // dmdb 未安装时的占位
  dmdb = null;
}

class Dm8ModelAdapter<T = any> implements IModelAdapter<T> {
  constructor(
    private pool: any,
    private tableName: string,
  ) {}

  private async getConnection() {
    return this.pool.getConnection();
  }

  async findMany(args?: FindManyArgs): Promise<T[]> {
    const conn = await this.getConnection();
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      if (args?.where) {
        const whereClause = this.buildWhereClause(args.where, params);
        sql += ` WHERE ${whereClause}`;
      }

      if (args?.orderBy) {
        const orderClause = this.buildOrderClause(args.orderBy);
        sql += ` ORDER BY ${orderClause}`;
      }

      if (args?.skip !== undefined && args?.take !== undefined) {
        // DM8 使用 OFFSET FETCH
        sql += ` OFFSET ${args.skip} ROWS FETCH NEXT ${args.take} ROWS ONLY`;
      } else if (args?.take !== undefined) {
        sql += ` FETCH NEXT ${args.take} ROWS ONLY`;
      }

      const result = await conn.execute(sql, params, { resultSet: true });
      const rows = result.rows || [];
      return rows as T[];
    } finally {
      conn.close();
    }
  }

  async findFirst(args: FindFirstArgs): Promise<T | null> {
    const results = await this.findMany({
      where: args.where,
      take: 1,
      select: args.select,
    });
    return results[0] || null;
  }

  async findFirstOrThrow(args: FindFirstArgs): Promise<T> {
    const result = await this.findFirst(args);
    if (!result) {
      throw new Error(`Record not found in ${this.tableName}`);
    }
    return result;
  }

  async findUnique(args: { where: Record<string, any>; select?: Record<string, any> }): Promise<T | null> {
    return this.findFirst({ where: args.where, select: args.select });
  }

  async findUniqueOrThrow(args: { where: Record<string, any> }): Promise<T> {
    return this.findFirstOrThrow({ where: args.where });
  }

  async create(args: CreateArgs): Promise<T> {
    const conn = await this.getConnection();
    try {
      const data = args.data;
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `:${i + 1}`);

      const sql = `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;

      await conn.execute(sql, values);

      // 返回创建的记录（DM8 没有 RETURNING，需要重新查询）
      // 假设有 id 字段
      if (data.id) {
        return this.findUniqueOrThrow({ where: { id: data.id } });
      }

      return data as T;
    } finally {
      conn.close();
    }
  }

  async createMany(args: { data: Record<string, any>[] }): Promise<number> {
    const conn = await this.getConnection();
    try {
      let count = 0;
      for (const item of args.data) {
        const columns = Object.keys(item);
        const values = Object.values(item);
        const placeholders = columns.map((_, i) => `:${i + 1}`);

        const sql = `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
        await conn.execute(sql, values);
        count++;
      }
      return count;
    } finally {
      conn.close();
    }
  }

  async update(args: UpdateArgs): Promise<T> {
    const conn = await this.getConnection();
    try {
      const { data, where } = args;
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        setClauses.push(`${key} = :${paramIndex}`);
        params.push(value);
        paramIndex++;
      }

      const whereClause = this.buildWhereClause(where, params, paramIndex);
      const sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")} WHERE ${whereClause}`;

      await conn.execute(sql, params);

      // 返回更新后的记录
      return this.findUniqueOrThrow({ where });
    } finally {
      conn.close();
    }
  }

  async updateMany(args: { where?: Record<string, any>; data: Record<string, any> }): Promise<number> {
    const conn = await this.getConnection();
    try {
      const { data, where } = args;
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        setClauses.push(`${key} = :${paramIndex}`);
        params.push(value);
        paramIndex++;
      }

      let sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")}`;

      if (where) {
        const whereClause = this.buildWhereClause(where, params, paramIndex);
        sql += ` WHERE ${whereClause}`;
      }

      const result = await conn.execute(sql, params);
      return result.rowsAffected || 0;
    } finally {
      conn.close();
    }
  }

  async upsert(args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }): Promise<T> {
    const existing = await this.findFirst({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update });
    } else {
      return this.create({ data: args.create });
    }
  }

  async delete(args: DeleteArgs): Promise<T> {
    const record = await this.findUniqueOrThrow({ where: args.where });
    const conn = await this.getConnection();
    try {
      const params: any[] = [];
      const whereClause = this.buildWhereClause(args.where, params);
      const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
      await conn.execute(sql, params);
      return record;
    } finally {
      conn.close();
    }
  }

  async deleteMany(args?: { where?: Record<string, any> }): Promise<number> {
    const conn = await this.getConnection();
    try {
      let sql = `DELETE FROM ${this.tableName}`;
      const params: any[] = [];

      if (args?.where) {
        const whereClause = this.buildWhereClause(args.where, params);
        sql += ` WHERE ${whereClause}`;
      }

      const result = await conn.execute(sql, params);
      return result.rowsAffected || 0;
    } finally {
      conn.close();
    }
  }

  async count(args?: CountArgs): Promise<number> {
    const conn = await this.getConnection();
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params: any[] = [];

      if (args?.where) {
        const whereClause = this.buildWhereClause(args.where, params);
        sql += ` WHERE ${whereClause}`;
      }

      const result = await conn.execute(sql, params);
      return result.rows[0]?.count || 0;
    } finally {
      conn.close();
    }
  }

  async groupBy(args: GroupByArgs): Promise<any[]> {
    const conn = await this.getConnection();
    try {
      const selectParts: string[] = [...args.by];
      const groupByParts: string[] = [...args.by];

      if (args._sum) {
        for (const key of Object.keys(args._sum)) {
          selectParts.push(`SUM(${key}) as _sum_${key}`);
        }
      }

      if (args._count) {
        for (const key of Object.keys(args._count)) {
          selectParts.push(`COUNT(${key}) as _count_${key}`);
        }
      }

      if (args._avg) {
        for (const key of Object.keys(args._avg)) {
          selectParts.push(`AVG(${key}) as _avg_${key}`);
        }
      }

      let sql = `SELECT ${selectParts.join(", ")} FROM ${this.tableName}`;
      const params: any[] = [];

      if (args.where) {
        const whereClause = this.buildWhereClause(args.where, params);
        sql += ` WHERE ${whereClause}`;
      }

      sql += ` GROUP BY ${groupByParts.join(", ")}`;

      const result = await conn.execute(sql, params, { resultSet: true });
      return result.rows || [];
    } finally {
      conn.close();
    }
  }

  async aggregate(args: AggregateArgs): Promise<any> {
    const conn = await this.getConnection();
    try {
      const selectParts: string[] = [];

      if (args._sum) {
        for (const key of Object.keys(args._sum)) {
          selectParts.push(`SUM(${key}) as _sum_${key}`);
        }
      }

      if (args._count) {
        for (const key of Object.keys(args._count)) {
          selectParts.push(`COUNT(${key}) as _count_${key}`);
        }
      }

      if (args._avg) {
        for (const key of Object.keys(args._avg)) {
          selectParts.push(`AVG(${key}) as _avg_${key}`);
        }
      }

      if (args._min) {
        for (const key of Object.keys(args._min)) {
          selectParts.push(`MIN(${key}) as _min_${key}`);
        }
      }

      if (args._max) {
        for (const key of Object.keys(args._max)) {
          selectParts.push(`MAX(${key}) as _max_${key}`);
        }
      }

      if (selectParts.length === 0) {
        return {};
      }

      let sql = `SELECT ${selectParts.join(", ")} FROM ${this.tableName}`;
      const params: any[] = [];

      if (args.where) {
        const whereClause = this.buildWhereClause(args.where, params);
        sql += ` WHERE ${whereClause}`;
      }

      const result = await conn.execute(sql, params);
      return result.rows[0] || {};
    } finally {
      conn.close();
    }
  }

  // ==================== 辅助方法 ====================

  private buildWhereClause(where: Record<string, any>, params: any[], startParamIndex: number = 1): string {
    const conditions: string[] = [];
    let paramIndex = startParamIndex;

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (value === undefined) {
        continue;
      } else if (typeof value === "object" && !Array.isArray(value)) {
        // 处理操作符：{ gt: 5 }, { contains: "abc" }, etc.
        for (const [op, opValue] of Object.entries(value)) {
          switch (op) {
            case "equals":
              conditions.push(`${key} = :${paramIndex}`);
              params.push(opValue);
              paramIndex++;
              break;
            case "not":
              if (opValue === null) {
                conditions.push(`${key} IS NOT NULL`);
              } else {
                conditions.push(`${key} != :${paramIndex}`);
                params.push(opValue);
                paramIndex++;
              }
              break;
            case "gt":
              conditions.push(`${key} > :${paramIndex}`);
              params.push(opValue);
              paramIndex++;
              break;
            case "gte":
              conditions.push(`${key} >= :${paramIndex}`);
              params.push(opValue);
              paramIndex++;
              break;
            case "lt":
              conditions.push(`${key} < :${paramIndex}`);
              params.push(opValue);
              paramIndex++;
              break;
            case "lte":
              conditions.push(`${key} <= :${paramIndex}`);
              params.push(opValue);
              paramIndex++;
              break;
            case "contains":
              conditions.push(`${key} LIKE :${paramIndex}`);
              params.push(`%${opValue}%`);
              paramIndex++;
              break;
            case "startsWith":
              conditions.push(`${key} LIKE :${paramIndex}`);
              params.push(`${opValue}%`);
              paramIndex++;
              break;
            case "endsWith":
              conditions.push(`${key} LIKE :${paramIndex}`);
              params.push(`%${opValue}`);
              paramIndex++;
              break;
            case "in":
              if (Array.isArray(opValue) && opValue.length > 0) {
                const inPlaceholders = opValue.map((_: any, i: number) => `:${paramIndex + i}`);
                conditions.push(`${key} IN (${inPlaceholders.join(", ")})`);
                params.push(...opValue);
                paramIndex += opValue.length;
              } else if (Array.isArray(opValue) && opValue.length === 0) {
                conditions.push("1 = 0"); // 空数组，不匹配任何记录
              }
              break;
            case "notIn":
              if (Array.isArray(opValue) && opValue.length > 0) {
                const notInPlaceholders = opValue.map((_: any, i: number) => `:${paramIndex + i}`);
                conditions.push(`${key} NOT IN (${notInPlaceholders.join(", ")})`);
                params.push(...opValue);
                paramIndex += opValue.length;
              }
              break;
            case "between":
              if (Array.isArray(opValue) && opValue.length === 2) {
                conditions.push(`${key} BETWEEN :${paramIndex} AND :${paramIndex + 1}`);
                params.push(opValue[0], opValue[1]);
                paramIndex += 2;
              }
              break;
            case "isNull":
              if (opValue) {
                conditions.push(`${key} IS NULL`);
              } else {
                conditions.push(`${key} IS NOT NULL`);
              }
              break;
            default:
              // 未知操作符，使用等于
              conditions.push(`${key} = :${paramIndex}`);
              params.push(opValue);
              paramIndex++;
          }
        }
      } else if (Array.isArray(value)) {
        // 数组值，使用 IN
        if (value.length > 0) {
          const inPlaceholders = value.map((_: any, i: number) => `:${paramIndex + i}`);
          conditions.push(`${key} IN (${inPlaceholders.join(", ")})`);
          params.push(...value);
          paramIndex += value.length;
        } else {
          conditions.push("1 = 0");
        }
      } else {
        // 简单值，使用等于
        conditions.push(`${key} = :${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    return conditions.length > 0 ? conditions.join(" AND ") : "1 = 1";
  }

  private buildOrderClause(orderBy: Record<string, any> | Record<string, any>[]): string {
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    const parts: string[] = [];

    for (const order of orders) {
      for (const [key, direction] of Object.entries(order)) {
        const dir = direction === "desc" ? "DESC" : "ASC";
        parts.push(`${key} ${dir}`);
      }
    }

    return parts.join(", ");
  }
}

export class Dm8Adapter implements IDatabaseAdapter {
  readonly dbType = "dm8" as const;

  private pool: any;

  // Model 适配器
  account: IModelAdapter;
  session: IModelAdapter;
  user: IModelAdapter;
  verificationToken: IModelAdapter;
  project: IModelAdapter;
  apiKey: IModelAdapter;
  llmApiKeys: IModelAdapter;
  projectMembership: IModelAdapter;
  membershipInvitation: IModelAdapter;
  traceSession: IModelAdapter;
  trace: IModelAdapter;
  observation: IModelAdapter;
  score: IModelAdapter;
  scoreConfig: IModelAdapter;
  cronJobs: IModelAdapter;
  dataset: IModelAdapter;
  datasetItem: IModelAdapter;
  datasetRuns: IModelAdapter;
  datasetRunItems: IModelAdapter;
  events: IModelAdapter;
  prompt: IModelAdapter;
  model: IModelAdapter;
  auditLog: IModelAdapter;
  evalTemplate: IModelAdapter;
  jobConfiguration: IModelAdapter;
  jobExecution: IModelAdapter;
  ssoConfig: IModelAdapter;
  posthogIntegration: IModelAdapter;
  batchExport: IModelAdapter;

  constructor(connectionString: string) {
    if (!dmdb) {
      throw new Error("dmdb package is not installed. Run: pnpm add dmdb");
    }

    // 创建连接池
    this.pool = new dmdb.createPool({
      connectionString,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
    });

    // 初始化所有 model 适配器
    this.account = new Dm8ModelAdapter(this.pool, "Account");
    this.session = new Dm8ModelAdapter(this.pool, "Session");
    this.user = new Dm8ModelAdapter(this.pool, "User");
    this.verificationToken = new Dm8ModelAdapter(this.pool, "VerificationToken");
    this.project = new Dm8ModelAdapter(this.pool, "Project");
    this.apiKey = new Dm8ModelAdapter(this.pool, "ApiKey");
    this.llmApiKeys = new Dm8ModelAdapter(this.pool, "LlmApiKeys");
    this.projectMembership = new Dm8ModelAdapter(this.pool, "ProjectMembership");
    this.membershipInvitation = new Dm8ModelAdapter(this.pool, "MembershipInvitation");
    this.traceSession = new Dm8ModelAdapter(this.pool, "TraceSession");
    this.trace = new Dm8ModelAdapter(this.pool, "Trace");
    this.observation = new Dm8ModelAdapter(this.pool, "Observation");
    this.score = new Dm8ModelAdapter(this.pool, "Score");
    this.scoreConfig = new Dm8ModelAdapter(this.pool, "ScoreConfig");
    this.cronJobs = new Dm8ModelAdapter(this.pool, "CronJobs");
    this.dataset = new Dm8ModelAdapter(this.pool, "Dataset");
    this.datasetItem = new Dm8ModelAdapter(this.pool, "DatasetItem");
    this.datasetRuns = new Dm8ModelAdapter(this.pool, "DatasetRuns");
    this.datasetRunItems = new Dm8ModelAdapter(this.pool, "DatasetRunItems");
    this.events = new Dm8ModelAdapter(this.pool, "Events");
    this.prompt = new Dm8ModelAdapter(this.pool, "Prompt");
    this.model = new Dm8ModelAdapter(this.pool, "Model");
    this.auditLog = new Dm8ModelAdapter(this.pool, "AuditLog");
    this.evalTemplate = new Dm8ModelAdapter(this.pool, "EvalTemplate");
    this.jobConfiguration = new Dm8ModelAdapter(this.pool, "JobConfiguration");
    this.jobExecution = new Dm8ModelAdapter(this.pool, "JobExecution");
    this.ssoConfig = new Dm8ModelAdapter(this.pool, "SsoConfig");
    this.posthogIntegration = new Dm8ModelAdapter(this.pool, "PosthogIntegration");
    this.batchExport = new Dm8ModelAdapter(this.pool, "BatchExport");
  }

  // === 原始 SQL 查询 ===
  async queryRaw<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const conn = await this.pool.getConnection();
    try {
      const result = await conn.execute(sql, params, { resultSet: true });
      return (result.rows || []) as T[];
    } finally {
      conn.close();
    }
  }

  async executeRaw(sql: string, ...params: any[]): Promise<number> {
    const conn = await this.pool.getConnection();
    try {
      const result = await conn.execute(sql, params);
      return result.rowsAffected || 0;
    } finally {
      conn.close();
    }
  }

  // === 事务 ===
  async transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.execute("BEGIN TRANSACTION");

      // 创建一个使用同一连接的适配器
      const txAdapter = new Dm8AdapterWithConnection(conn);

      const result = await fn(txAdapter);

      await conn.execute("COMMIT");
      return result;
    } catch (error) {
      await conn.execute("ROLLBACK");
      throw error;
    } finally {
      conn.close();
    }
  }

  // === 健康检查 ===
  async healthCheck(): Promise<boolean> {
    try {
      const conn = await this.pool.getConnection();
      try {
        await conn.execute("SELECT 1");
        return true;
      } finally {
        conn.close();
      }
    } catch {
      return false;
    }
  }

  // === 连接管理 ===
  async connect(): Promise<void> {
    // dmdb 连接池在构造时创建，无需额外操作
  }

  async disconnect(): Promise<void> {
    if (this.pool && typeof this.pool.close === "function") {
      await this.pool.close();
    }
  }
}

/**
 * 使用指定连接的 DM8 适配器（用于事务）
 */
class Dm8AdapterWithConnection implements IDatabaseAdapter {
  readonly dbType = "dm8" as const;

  private conn: any;
  private _pool: any;

  // Model 适配器（简化版，使用传入的连接）
  account: IModelAdapter;
  session: IModelAdapter;
  user: IModelAdapter;
  verificationToken: IModelAdapter;
  project: IModelAdapter;
  apiKey: IModelAdapter;
  llmApiKeys: IModelAdapter;
  projectMembership: IModelAdapter;
  membershipInvitation: IModelAdapter;
  traceSession: IModelAdapter;
  trace: IModelAdapter;
  observation: IModelAdapter;
  score: IModelAdapter;
  scoreConfig: IModelAdapter;
  cronJobs: IModelAdapter;
  dataset: IModelAdapter;
  datasetItem: IModelAdapter;
  datasetRuns: IModelAdapter;
  datasetRunItems: IModelAdapter;
  events: IModelAdapter;
  prompt: IModelAdapter;
  model: IModelAdapter;
  auditLog: IModelAdapter;
  evalTemplate: IModelAdapter;
  jobConfiguration: IModelAdapter;
  jobExecution: IModelAdapter;
  ssoConfig: IModelAdapter;
  posthogIntegration: IModelAdapter;
  batchExport: IModelAdapter;

  constructor(conn: any) {
    this.conn = conn;
    this._pool = { getConnection: () => Promise.resolve(conn) };

    // 初始化所有 model 适配器
    this.account = new Dm8ModelAdapter(this._pool, "Account");
    this.session = new Dm8ModelAdapter(this._pool, "Session");
    this.user = new Dm8ModelAdapter(this._pool, "User");
    this.verificationToken = new Dm8ModelAdapter(this._pool, "VerificationToken");
    this.project = new Dm8ModelAdapter(this._pool, "Project");
    this.apiKey = new Dm8ModelAdapter(this._pool, "ApiKey");
    this.llmApiKeys = new Dm8ModelAdapter(this._pool, "LlmApiKeys");
    this.projectMembership = new Dm8ModelAdapter(this._pool, "ProjectMembership");
    this.membershipInvitation = new Dm8ModelAdapter(this._pool, "MembershipInvitation");
    this.traceSession = new Dm8ModelAdapter(this._pool, "TraceSession");
    this.trace = new Dm8ModelAdapter(this._pool, "Trace");
    this.observation = new Dm8ModelAdapter(this._pool, "Observation");
    this.score = new Dm8ModelAdapter(this._pool, "Score");
    this.scoreConfig = new Dm8ModelAdapter(this._pool, "ScoreConfig");
    this.cronJobs = new Dm8ModelAdapter(this._pool, "CronJobs");
    this.dataset = new Dm8ModelAdapter(this._pool, "Dataset");
    this.datasetItem = new Dm8ModelAdapter(this._pool, "DatasetItem");
    this.datasetRuns = new Dm8ModelAdapter(this._pool, "DatasetRuns");
    this.datasetRunItems = new Dm8ModelAdapter(this._pool, "DatasetRunItems");
    this.events = new Dm8ModelAdapter(this._pool, "Events");
    this.prompt = new Dm8ModelAdapter(this._pool, "Prompt");
    this.model = new Dm8ModelAdapter(this._pool, "Model");
    this.auditLog = new Dm8ModelAdapter(this._pool, "AuditLog");
    this.evalTemplate = new Dm8ModelAdapter(this._pool, "EvalTemplate");
    this.jobConfiguration = new Dm8ModelAdapter(this._pool, "JobConfiguration");
    this.jobExecution = new Dm8ModelAdapter(this._pool, "JobExecution");
    this.ssoConfig = new Dm8ModelAdapter(this._pool, "SsoConfig");
    this.posthogIntegration = new Dm8ModelAdapter(this._pool, "PosthogIntegration");
    this.batchExport = new Dm8ModelAdapter(this._pool, "BatchExport");
  }

  async queryRaw<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const result = await this.conn.execute(sql, params, { resultSet: true });
    return (result.rows || []) as T[];
  }

  async executeRaw(sql: string, ...params: any[]): Promise<number> {
    const result = await this.conn.execute(sql, params);
    return result.rowsAffected || 0;
  }

  async transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    // 嵌套事务：DM8 使用 SAVEPOINT
    const savepointName = `SP_${Date.now()}`;
    await this.conn.execute(`SAVEPOINT ${savepointName}`);

    try {
      const result = await fn(this);
      await this.conn.execute(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      await this.conn.execute(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.conn.execute("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    // 已经有连接，无需操作
  }

  async disconnect(): Promise<void> {
    // 不关闭传入的连接，由调用方管理
  }
}
