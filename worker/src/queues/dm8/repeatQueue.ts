/**
 * DM8 版本的定时任务队列
 * 使用数据库队列替代 BullMQ 的 Redis 队列
 */

import { DbQueue } from "@langfuse/shared/src/queue";
import { QueueName, QueueJobs } from "@langfuse/shared";
import { enqueueBatchExportJobs } from "../../features/batchExport/enqueueBatchExportJobs";
import logger from "../../logger";

// 解析 DM8 连接串，支持密码中包含 @ 等特殊字符
function parseDm8Url(url: string): string {
  if (!url.startsWith('dm://')) return url;
  const withoutScheme = url.slice(5);
  const lastAtIndex = withoutScheme.lastIndexOf('@');
  if (lastAtIndex === -1) return url;
  const afterAt = withoutScheme.slice(lastAtIndex + 1);
  if (!/^[\w][\w.-]*:\d+/.test(afterAt)) return url;
  const beforeAt = withoutScheme.slice(0, lastAtIndex);
  const colonIndex = beforeAt.indexOf(':');
  if (colonIndex === -1) return url;
  const user = beforeAt.slice(0, colonIndex);
  const password = beforeAt.slice(colonIndex + 1);
  const encodedPassword = password.replace(/@/g, '%40');
  return `dm://${user}:${encodedPassword}@${afterAt}`;
}

// 获取数据库连接池
async function getPool() {
  const dmdb = eval("require")("dmdb");
  const connectionString = parseDm8Url(process.env.DATABASE_URL || '');
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for DM8 mode");
  }
  // 使用唯一的池别名
  const poolAlias = 'repeat_q_' + Math.abs(hashCode(connectionString)).toString(16);
  try {
    return dmdb.createPool({
      connectString: connectionString,
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

// 简单的字符串 hash 函数
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
