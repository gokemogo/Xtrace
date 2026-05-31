/**
 * 任务队列模块
 * 提供数据库队列实现，替代 BullMQ 的 Redis 队列
 */

export { DbQueue } from './db-queue';
export type {
  IJobQueue,
  IQueueWorker,
  JobData,
  JobOptions,
  JobResult,
} from './queue-interface';
