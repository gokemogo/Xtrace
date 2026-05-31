import { prisma } from "@langfuse/shared/src/db";
import { getDbType } from "@langfuse/shared/src/db-adapter/factory";
import { Response } from "express";
import logger from "../../logger";

// Redis 连接（仅在 PostgreSQL 模式下使用）
let redis: any = null;
if (getDbType() === "postgresql") {
  try {
    redis = require("../../redis").redis;
  } catch (e) {
    logger.warn("Failed to initialize Redis client for health check");
  }
}

export const checkContainerHealth = async (res: Response) => {
  if (isSigtermReceived()) {
    logger.info(
      "Health check failed: SIGTERM / SIGINT received, shutting down."
    );
    return res.status(500).json({
      status: "SIGTERM / SIGINT received, shutting down",
    });
  }

  //check database health
  await prisma.$queryRaw`SELECT 1;`;

  const dbType = getDbType();

  if (dbType === "postgresql") {
    // PostgreSQL 模式：检查 Redis 连接
    if (!redis) {
      throw new Error("Redis connection not available");
    }

    await Promise.race([
      redis?.ping(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Redis ping timeout after 2 seconds")),
          2000
        )
      ),
    ]);
  } else {
    // DM8 模式：检查任务队列表是否可访问
    try {
      await prisma.$queryRaw`SELECT COUNT(*) FROM "job_queue"`;
    } catch (e) {
      logger.warn("job_queue table not accessible, but database is healthy");
    }
  }

  res.json({
    status: "ok",
    database: dbType,
    queue: dbType === "postgresql" ? "redis" : "database",
  });
};

let sigtermReceived: boolean = false;

export const setSigtermReceived = () => {
  logger.info("Set sigterm received to true");
  sigtermReceived = true;
};

const isSigtermReceived = () => sigtermReceived;
