/**
 * Prisma Adapter for PostgreSQL
 *
 * 包装 PrismaClient，实现 IDatabaseAdapter 接口
 * PostgreSQL 行为完全不变
 */

import { PrismaClient } from "@prisma/client";
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

class PrismaModelAdapter<T = any> implements IModelAdapter<T> {
  constructor(private model: any) {}

  async findMany(args?: FindManyArgs): Promise<T[]> {
    return this.model.findMany(args);
  }

  async findFirst(args: FindFirstArgs): Promise<T | null> {
    return this.model.findFirst(args);
  }

  async findFirstOrThrow(args: FindFirstArgs): Promise<T> {
    return this.model.findFirstOrThrow(args);
  }

  async findUnique(args: { where: Record<string, any>; select?: Record<string, any> }): Promise<T | null> {
    return this.model.findUnique(args);
  }

  async findUniqueOrThrow(args: { where: Record<string, any> }): Promise<T> {
    return this.model.findUniqueOrThrow(args);
  }

  async create(args: CreateArgs): Promise<T> {
    return this.model.create(args);
  }

  async createMany(args: { data: Record<string, any>[] }): Promise<number> {
    const result = await this.model.createMany(args);
    return result.count;
  }

  async update(args: UpdateArgs): Promise<T> {
    return this.model.update(args);
  }

  async updateMany(args: { where?: Record<string, any>; data: Record<string, any> }): Promise<number> {
    const result = await this.model.updateMany(args);
    return result.count;
  }

  async upsert(args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }): Promise<T> {
    return this.model.upsert(args);
  }

  async delete(args: DeleteArgs): Promise<T> {
    return this.model.delete(args);
  }

  async deleteMany(args?: { where?: Record<string, any> }): Promise<number> {
    const result = await this.model.deleteMany(args);
    return result.count;
  }

  async count(args?: CountArgs): Promise<number> {
    return this.model.count(args);
  }

  async groupBy(args: GroupByArgs): Promise<any[]> {
    return this.model.groupBy(args);
  }

  async aggregate(args: AggregateArgs): Promise<any> {
    return this.model.aggregate(args);
  }
}

export class PrismaAdapter implements IDatabaseAdapter {
  readonly dbType = "postgresql" as const;

  private prisma: PrismaClient;

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

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    // 初始化所有 model 适配器
    this.account = new PrismaModelAdapter(prisma.account);
    this.session = new PrismaModelAdapter(prisma.session);
    this.user = new PrismaModelAdapter(prisma.user);
    this.verificationToken = new PrismaModelAdapter(prisma.verificationToken);
    this.project = new PrismaModelAdapter(prisma.project);
    this.apiKey = new PrismaModelAdapter(prisma.apiKey);
    this.llmApiKeys = new PrismaModelAdapter(prisma.llmApiKeys);
    this.projectMembership = new PrismaModelAdapter(prisma.projectMembership);
    this.membershipInvitation = new PrismaModelAdapter(prisma.membershipInvitation);
    this.traceSession = new PrismaModelAdapter(prisma.traceSession);
    this.trace = new PrismaModelAdapter(prisma.trace);
    this.observation = new PrismaModelAdapter(prisma.observation);
    this.score = new PrismaModelAdapter(prisma.score);
    this.scoreConfig = new PrismaModelAdapter(prisma.scoreConfig);
    this.cronJobs = new PrismaModelAdapter(prisma.cronJobs);
    this.dataset = new PrismaModelAdapter(prisma.dataset);
    this.datasetItem = new PrismaModelAdapter(prisma.datasetItem);
    this.datasetRuns = new PrismaModelAdapter(prisma.datasetRuns);
    this.datasetRunItems = new PrismaModelAdapter(prisma.datasetRunItems);
    this.events = new PrismaModelAdapter(prisma.events);
    this.prompt = new PrismaModelAdapter(prisma.prompt);
    this.model = new PrismaModelAdapter(prisma.model);
    this.auditLog = new PrismaModelAdapter(prisma.auditLog);
    this.evalTemplate = new PrismaModelAdapter(prisma.evalTemplate);
    this.jobConfiguration = new PrismaModelAdapter(prisma.jobConfiguration);
    this.jobExecution = new PrismaModelAdapter(prisma.jobExecution);
    this.ssoConfig = new PrismaModelAdapter(prisma.ssoConfig);
    this.posthogIntegration = new PrismaModelAdapter(prisma.posthogIntegration);
    this.batchExport = new PrismaModelAdapter(prisma.batchExport);
  }

  // === 原始 SQL 查询 ===
  async queryRaw<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    return this.prisma.$queryRawUnsafe(sql, ...params) as Promise<T[]>;
  }

  async executeRaw(sql: string, ...params: any[]): Promise<number> {
    return this.prisma.$executeRawUnsafe(sql, ...params);
  }

  // === 事务 ===
  async transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const txAdapter = new PrismaAdapter(tx);
      return fn(txAdapter);
    });
  }

  // === 健康检查 ===
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // === 连接管理 ===
  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
