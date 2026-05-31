/**
 * Database Adapter Factory
 *
 * 根据 DB_TYPE 环境变量创建对应的数据库适配器
 */

import type { IDatabaseAdapter, DbType } from "./interface";
import { PrismaAdapter } from "./prisma-adapter";

let adapter: IDatabaseAdapter | null = null;

/**
 * 获取数据库适配器单例
 */
export function getAdapter(): IDatabaseAdapter {
  if (adapter) {
    return adapter;
  }

  const dbType = getDbType();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (dbType === "dm8") {
    // 动态导入 dm8-adapter，避免在客户端打包时引入 dmdb
    const { Dm8Adapter } = require("./dm8-adapter");
    adapter = new Dm8Adapter(connectionString);
  } else {
    // PostgreSQL 模式：使用 Prisma
    const { prisma } = require("../db");
    adapter = new PrismaAdapter(prisma);
  }

  return adapter!;
}

/**
 * 获取数据库类型
 */
export function getDbType(): DbType {
  const dbType = process.env.DB_TYPE || "postgresql";
  if (dbType !== "postgresql" && dbType !== "dm8") {
    throw new Error(`Invalid DB_TYPE: ${dbType}. Must be "postgresql" or "dm8"`);
  }
  return dbType as DbType;
}

/**
 * 重置适配器（用于测试）
 */
export function resetAdapter(): void {
  adapter = null;
}

/**
 * 检查是否使用 DM8
 */
export function isDm8(): boolean {
  return getDbType() === "dm8";
}

/**
 * 检查是否使用 PostgreSQL
 */
export function isPostgresql(): boolean {
  return getDbType() === "postgresql";
}
