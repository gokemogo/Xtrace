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

// 获取数据库连接池
async function getPool() {
  // 使用 prisma 的底层连接池
  // 这里我们需要从 db.ts 获取 dm8 pool
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
  });
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
