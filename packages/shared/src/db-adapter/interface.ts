/**
 * Database Adapter Interface
 *
 * 支持 PostgreSQL (via Prisma) 和 DM8 (via dmdb) 的双数据库适配器接口
 */

export type DbType = "postgresql" | "dm8";

// ==================== 通用类型 ====================

export interface FindManyArgs {
  where?: Record<string, any>;
  orderBy?: Record<string, any> | Record<string, any>[];
  skip?: number;
  take?: number;
  select?: Record<string, any>;
  include?: Record<string, any>;
}

export interface FindFirstArgs {
  where: Record<string, any>;
  select?: Record<string, any>;
  include?: Record<string, any>;
}

export interface CreateArgs {
  data: Record<string, any>;
  select?: Record<string, any>;
}

export interface UpdateArgs {
  where: Record<string, any>;
  data: Record<string, any>;
  select?: Record<string, any>;
}

export interface DeleteArgs {
  where: Record<string, any>;
}

export interface CountArgs {
  where?: Record<string, any>;
}

export interface GroupByArgs {
  by: string[];
  where?: Record<string, any>;
  _sum?: Record<string, boolean>;
  _count?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  orderBy?: Record<string, any>;
  having?: Record<string, any>;
}

export interface AggregateArgs {
  where?: Record<string, any>;
  _sum?: Record<string, boolean>;
  _count?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}

// ==================== Model Adapter 接口 ====================

export interface IModelAdapter<T = any> {
  findMany(args?: FindManyArgs): Promise<T[]>;
  findFirst(args: FindFirstArgs): Promise<T | null>;
  findFirstOrThrow(args: FindFirstArgs): Promise<T>;
  findUnique(args: { where: Record<string, any>; select?: Record<string, any> }): Promise<T | null>;
  findUniqueOrThrow(args: { where: Record<string, any> }): Promise<T>;
  create(args: CreateArgs): Promise<T>;
  createMany(args: { data: Record<string, any>[] }): Promise<number>;
  update(args: UpdateArgs): Promise<T>;
  updateMany(args: { where?: Record<string, any>; data: Record<string, any> }): Promise<number>;
  upsert(args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }): Promise<T>;
  delete(args: DeleteArgs): Promise<T>;
  deleteMany(args?: { where?: Record<string, any> }): Promise<number>;
  count(args?: CountArgs): Promise<number>;
  groupBy(args: GroupByArgs): Promise<any[]>;
  aggregate(args: AggregateArgs): Promise<any>;
}

// ==================== 特殊操作接口 ====================

export interface IRawQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// ==================== 数据库适配器接口 ====================

export interface IDatabaseAdapter {
  // === 数据库类型 ===
  readonly dbType: DbType;

  // === 原始 SQL 查询 ===
  queryRaw<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  executeRaw(sql: string, ...params: any[]): Promise<number>;

  // === Model 适配器 ===
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

  // === 事务 ===
  transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;

  // === 健康检查 ===
  healthCheck(): Promise<boolean>;

  // === 连接管理 ===
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// ==================== 工厂函数类型 ====================

export type AdapterFactory = (connectionString: string) => IDatabaseAdapter;
