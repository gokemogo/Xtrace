/**
 * 队列工厂
 * 根据 DB_TYPE 选择使用 BullMQ (Redis) 或数据库队列 (DM8)
 */

import { getDbType } from "@langfuse/shared/src/db-adapter/factory";
import logger from "./logger";

// BullMQ 队列（PostgreSQL 模式）
import { evalQueue as bullmqEvalQueue, evalJobCreator, evalJobExecutor } from "./queues/evalQueue";
import { batchExportQueue as bullmqBatchExportQueue, batchExportJobExecutor } from "./queues/batchExportQueue";
import { repeatQueue as bullmqRepeatQueue, repeatQueueExecutor } from "./queues/repeatQueue";

// DM8 数据库队列
import { getEvalQueue, startEvalJobCreator, startEvalJobExecutor } from "./queues/dm8/evalQueue";
import { getBatchExportQueue, startBatchExportJobExecutor } from "./queues/dm8/batchExportQueue";
import { getRepeatQueue, startRepeatQueueExecutor, initRepeatQueueJobs } from "./queues/dm8/repeatQueue";

export interface QueueInstances {
  evalQueue: any;
  batchExportQueue: any;
  repeatQueue: any;
  workers: Array<{ stop: () => void; isRunning: () => boolean }>;
}

let queueInstances: QueueInstances | null = null;

/**
 * 初始化队列系统
 */
export async function initializeQueues(): Promise<QueueInstances> {
  if (queueInstances) return queueInstances;

  const dbType = getDbType();
  logger.info(`Initializing queues for database type: ${dbType}`);

  if (dbType === "dm8") {
    // DM8 模式：使用数据库队列
    logger.info("Using database queues for DM8 mode");

    const evalQueue = await getEvalQueue();
    const batchExportQueue = await getBatchExportQueue();
    const repeatQueue = await getRepeatQueue();

    // 启动 Worker 处理器
    const evalCreatorWorker = await startEvalJobCreator();
    const evalExecutorWorker = await startEvalJobExecutor();
    const batchExportWorker = await startBatchExportJobExecutor();
    const repeatWorker = await startRepeatQueueExecutor();

    // 初始化定时任务
    await initRepeatQueueJobs();

    queueInstances = {
      evalQueue,
      batchExportQueue,
      repeatQueue,
      workers: [evalCreatorWorker, evalExecutorWorker, batchExportWorker, repeatWorker],
    };
  } else {
    // PostgreSQL 模式：使用 BullMQ 队列
    logger.info("Using BullMQ queues for PostgreSQL mode");

    queueInstances = {
      evalQueue: bullmqEvalQueue,
      batchExportQueue: bullmqBatchExportQueue,
      repeatQueue: bullmqRepeatQueue,
      workers: [
        {
          stop: () => {},
          isRunning: () => evalJobCreator?.isRunning() || false,
        },
        {
          stop: () => {},
          isRunning: () => evalJobExecutor?.isRunning() || false,
        },
        {
          stop: () => {},
          isRunning: () => batchExportJobExecutor?.isRunning() || false,
        },
        {
          stop: () => {},
          isRunning: () => repeatQueueExecutor?.isRunning() || false,
        },
      ],
    };
  }

  return queueInstances;
}

/**
 * 获取队列实例
 */
export async function getQueues(): Promise<QueueInstances> {
  if (!queueInstances) {
    return initializeQueues();
  }
  return queueInstances;
}

/**
 * 停止所有队列 Worker
 */
export async function stopQueues(): Promise<void> {
  if (queueInstances) {
    for (const worker of queueInstances.workers) {
      worker.stop();
    }
    queueInstances = null;
  }
}

/**
 * 获取评估队列
 */
export async function getEvalQueueInstance(): Promise<any> {
  const queues = await getQueues();
  return queues.evalQueue;
}

/**
 * 获取批量导出队列
 */
export async function getBatchExportQueueInstance(): Promise<any> {
  const queues = await getQueues();
  return queues.batchExportQueue;
}
