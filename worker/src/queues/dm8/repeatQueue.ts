/**
 * DM8 版本的定时任务队列
 * 使用数据库队列替代 BullMQ 的 Redis 队列
 */

import { DbQueue } from "@langfuse/shared/src/queue";
import { QueueName, QueueJobs } from "@langfuse/shared";
import { enqueueBatchExportJobs } from "../../features/batchExport/enqueueBatchExportJobs";
import logger from "../../logger";

// 获取数据库连接池
async function getPool() {
  const dmdb = eval("require")("dmdb");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for DM8 mode");
  }
  return dmdb.createPool({
    connectionString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolAlias: 'repeat_queue_pool',
  });
}

// 创建队列实例
let repeatQueueInstance: DbQueue | null = null;

export async function getRepeatQueue(): Promise<DbQueue> {
  if (repeatQueueInstance) return repeatQueueInstance;
  const pool = await getPool();
  repeatQueueInstance = new DbQueue(QueueName.RepeatQueue, pool);
  return repeatQueueInstance;
}

// 创建 Worker 处理器
export async function startRepeatQueueExecutor() {
  const queue = await getRepeatQueue();

  // 定期检查并处理任务
  const processInterval = setInterval(async () => {
    try {
      const job = await queue.process('repeat-queue-worker');
      if (job) {
        try {
          if (job.name === QueueJobs.EnqueueBatchExportJobs) {
            await enqueueBatchExportJobs();
          }
          await queue.complete(job.id);
        } catch (e) {
          logger.error(e, `Failed repeat queue job: ${job.name}`);
          await queue.fail(job.id, e instanceof Error ? e.message : 'Unknown error');
        }
      }
    } catch (e) {
      logger.error(e, 'Error processing repeat queue job');
    }
  }, 60000); // 每分钟检查一次

  return {
    stop: () => clearInterval(processInterval),
    isRunning: () => true,
  };
}

// 初始化定时任务
export async function initRepeatQueueJobs() {
  const queue = await getRepeatQueue();

  // 检查是否已经有 EnqueueBatchExportJobs 任务
  const stats = await queue.getStats();
  if (stats.pending === 0 && stats.delayed === 0) {
    // 添加定时任务（每 10 分钟执行一次）
    await queue.add(QueueJobs.EnqueueBatchExportJobs, {
      id: 'repeat-enqueue-batch-export',
      name: QueueJobs.EnqueueBatchExportJobs,
      timestamp: new Date(),
      payload: {},
    }, {
      delay: 0,
      attempts: 1,
    });
    logger.info('Initialized repeat queue jobs');
  }
}
