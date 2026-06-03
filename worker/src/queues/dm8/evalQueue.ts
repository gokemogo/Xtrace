/**
 * DM8 版本的评估队列
 * 使用数据库队列替代 BullMQ 的 Redis 队列
 */

import { DbQueue } from "@langfuse/shared/src/queue";
import {
  QueueName,
  TQueueJobTypes,
} from "@langfuse/shared";
import { evaluate, createEvalJobs } from "../../features/evaluation/eval-service";
import { prisma } from "@langfuse/shared/src/db";
import logger from "../../logger";
import * as Sentry from "@sentry/node";

// 解析 DM8 连接串，支持密码中包含 @ 等特殊字符
function parseDm8Url(url: string): string {
  if (!url.startsWith('dm://')) return url;
  const withoutScheme = url.slice(5);
  const lastAtIndex = withoutScheme.lastIndexOf('@');
  if (lastAtIndex === -1) return url;
  const afterAt = withoutScheme.slice(lastAtIndex + 1);
  if (/^[\w.]+:\d+/.test(afterAt)) {
    const beforeAt = withoutScheme.slice(0, lastAtIndex);
    const colonIndex = beforeAt.indexOf(':');
    if (colonIndex === -1) return url;
    const user = beforeAt.slice(0, colonIndex);
    const password = beforeAt.slice(colonIndex + 1);
    return `dm://${user}:${password}@${afterAt}`;
  }
  return url;
}

// 获取数据库连接池
async function getPool() {
  const dmdb = eval("require")("dmdb");
  const connectionString = parseDm8Url(process.env.DATABASE_URL || '');
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for DM8 mode");
  }
  const poolAlias = 'eval_q_' + Math.abs(hashCode(connectionString)).toString(16);
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
let evalQueueInstance: DbQueue | null = null;

export async function getEvalQueue(): Promise<DbQueue> {
  if (evalQueueInstance) return evalQueueInstance;
  const pool = await getPool();
  evalQueueInstance = new DbQueue(QueueName.EvaluationExecution, pool);
  return evalQueueInstance;
}

// 创建 Worker 处理器
export async function startEvalJobCreator() {
  const queue = await getEvalQueue();

  // 定期检查并处理任务
  const processInterval = setInterval(async () => {
    try {
      const job = await queue.process('eval-creator-worker');
      if (job) {
        try {
          await createEvalJobs({ event: job.data.payload });
          await queue.complete(job.id);
        } catch (e) {
          logger.error(
            e,
            `Failed job Evaluation for traceId ${job.data.payload.traceId} ${e}`
          );
          Sentry.captureException(e);
          await queue.fail(job.id, e instanceof Error ? e.message : 'Unknown error');
        }
      }
    } catch (e) {
      logger.error(e, 'Error processing eval job creator');
    }
  }, 1000); // 每秒检查一次

  return {
    stop: () => clearInterval(processInterval),
    isRunning: () => true,
  };
}

export async function startEvalJobExecutor() {
  const queue = await getEvalQueue();

  // 定期检查并处理任务
  const processInterval = setInterval(async () => {
    try {
      const job = await queue.process('eval-executor-worker');
      if (job) {
        try {
          logger.info("Executing Evaluation Execution Job", job.data);
          await evaluate({ event: job.data.payload });
          await queue.complete(job.id);
        } catch (e) {
          const displayError =
            e instanceof Error ? e.message : "An internal error occurred";

          // 更新 job_executions 表
          await prisma.jobExecution.update({
            where: {
              id: job.data.payload.jobExecutionId,
            },
            data: {
              status: "ERROR",
              endTime: new Date(),
              error: displayError,
            },
          });

          // do not log expected errors
          if (!(e instanceof Error) || !e.message.includes("API key for provider")) {
            logger.error(
              e,
              `Failed Evaluation_Execution job for id ${job.data.payload.jobExecutionId} ${e}`
            );
            Sentry.captureException(e);
          }

          await queue.fail(job.id, displayError);
        }
      }
    } catch (e) {
      logger.error(e, 'Error processing eval job executor');
    }
  }, 1000); // 每秒检查一次

  return {
    stop: () => clearInterval(processInterval),
    isRunning: () => true,
  };
}
