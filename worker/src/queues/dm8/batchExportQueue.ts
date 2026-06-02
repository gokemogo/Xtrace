/**
 * DM8 版本的批量导出队列
 * 使用数据库队列替代 BullMQ 的 Redis 队列
 */

import { DbQueue } from "@langfuse/shared/src/queue";
import {
  BaseError,
  BatchExportStatus,
  QueueName,
  TQueueJobTypes,
} from "@langfuse/shared";
import { prisma } from "@langfuse/shared/src/db";
import * as Sentry from "@sentry/node";

import logger from "../../logger";
import { handleBatchExportJob } from "../../features/batchExport/handleBatchExportJob";

// 获取数据库连接池
async function getPool() {
  const dmdb = eval("require")("dmdb");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for DM8 mode");
  }
  const poolAlias = 'batch_q_' + Math.abs(hashCode(connectionString)).toString(16);
  try {
    return dmdb.createPool({
      connectionString,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      poolAlias,
    });
  } catch (e: any) {
    if (e.errCode === 20006 || (e.message && e.message.includes('20006'))) {
      try {
        return dmdb.getPool(poolAlias);
      } catch {
        return dmdb.getPool();
      }
    }
    throw e;
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// 创建队列实例
let batchExportQueueInstance: DbQueue | null = null;

export async function getBatchExportQueue(): Promise<DbQueue> {
  if (batchExportQueueInstance) return batchExportQueueInstance;
  const pool = await getPool();
  batchExportQueueInstance = new DbQueue(QueueName.BatchExport, pool);
  return batchExportQueueInstance;
}

// 创建 Worker 处理器
export async function startBatchExportJobExecutor() {
  const queue = await getBatchExportQueue();

  // 定期检查并处理任务
  const processInterval = setInterval(async () => {
    try {
      const job = await queue.process('batch-export-worker');
      if (job) {
        try {
          logger.info("Executing Batch Export Job", job.data.payload);
          await handleBatchExportJob(job.data.payload);
          logger.info("Finished Batch Export Job", job.data.payload);
          await queue.complete(job.id);
        } catch (e) {
          const displayError =
            e instanceof BaseError ? e.message : "An internal error occurred";

          // 更新 batch_exports 表
          await prisma.batchExport.update({
            where: {
              id: job.data.payload.batchExportId,
            },
            data: {
              status: BatchExportStatus.FAILED,
              finishedAt: new Date(),
              log: displayError,
            },
          });

          logger.error(
            e,
            `Failed Batch Export job for id ${job.data.payload.batchExportId} ${e}`
          );
          Sentry.captureException(e);

          await queue.fail(job.id, displayError);
        }
      }
    } catch (e) {
      logger.error(e, 'Error processing batch export job');
    }
  }, 5000); // 每 5 秒检查一次（批量导出较慢）

  return {
    stop: () => clearInterval(processInterval),
    isRunning: () => true,
  };
}
