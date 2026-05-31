/**
 * Database Adapter Module
 *
 * 支持 PostgreSQL (via Prisma) 和 DM8 (via dmdb) 的双数据库适配器
 */

// 接口和类型
export type {
  IDatabaseAdapter,
  IModelAdapter,
  DbType,
  FindManyArgs,
  FindFirstArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
  CountArgs,
  GroupByArgs,
  AggregateArgs,
} from "./interface";

// 适配器实现
export { PrismaAdapter } from "./prisma-adapter";
// Dm8Adapter 不在此导出，因为它依赖 dmdb (Node.js only)
// 如需使用 Dm8Adapter，请直接 import from "./dm8-adapter"
// export { Dm8Adapter } from "./dm8-adapter";

// 工厂函数
export {
  getAdapter,
  getDbType,
  resetAdapter,
  isDm8,
  isPostgresql,
} from "./factory";

// SQL 方言兼容函数
export {
  ilike,
  jsonbObjectAgg,
  jsonBuildObject,
  jsonAgg,
  arrayLiteral,
  typeCast,
  paramTypeCast,
  arrayAgg,
  arrayAggFilter,
  arrayContains,
  arrayOverlaps,
  unnest,
  leftJoinLateral,
  extractEpoch,
  dateTrunc,
  lockTable,
  onConflictDoUpdate,
  now,
  interval,
  genRandomUuid,
  regexMatch,
  databaseSize,
  concat,
  coalesce,
  caseWhen,
  limitOffset,
  anyOperator,
  dm8TypeMap,
} from "./sql-dialect";
