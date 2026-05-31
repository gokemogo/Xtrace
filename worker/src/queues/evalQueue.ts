import { Job, Queue, Worker } from "bullmq";
import {
  ApiError,
  BaseError,
  QueueName,
  TQueueJobTypes,
} from "@langfuse/shared";
import { evaluate, createEvalJobs } from "../features/evaluation/eval-service";
import { prisma, kyselyPrisma } from "@langfuse/shared/src/db";
import { getDbType } from "@langfuse/shared/src/db-adapter/factory";
import logger from "../logger";
import { redis } from "../redis";
import { instrumentAsync } from "../instrumentation";
import * as Sentry from "@sentry/node";

// 仅在 PostgreSQL 模式下导入 Kysely
let sql: any;
if (getDbType() === "postgresql") {
  try {
    sql = require("kysely").sql;
  } catch {}
}

export const evalQueue = redis
  ? new Queue<TQueueJobTypes[QueueName.EvaluationExecution]>(
      QueueName.EvaluationExecution,
      {
        connection: redis,
      }
    )
  : null;

export const evalJobCreator = redis
  ? new Worker<TQueueJobTypes[QueueName.TraceUpsert]>(
      QueueName.TraceUpsert,
      async (job: Job<TQueueJobTypes[QueueName.TraceUpsert]>) => {
        return instrumentAsync({ name: "evalJobCreator" }, async () => {
          try {
            await createEvalJobs({ event: job.data.payload });
            return true;
          } catch (e) {
            logger.error(
              e,
              `Failed job Evaluation for traceId ${job.data.payload.traceId} ${e}`
            );
            Sentry.captureException(e);
            throw e;
          }
        });
      },
      {
        connection: redis,
        concurrency: 20,
        limiter: {
          // execute 75 calls in 1000ms
          max: 75,
          duration: 1000,
        },
      }
    )
  : null;

export const evalJobExecutor = redis
  ? new Worker<TQueueJobTypes[QueueName.EvaluationExecution]>(
      QueueName.EvaluationExecution,
      async (job: Job<TQueueJobTypes[QueueName.EvaluationExecution]>) => {
        return instrumentAsync({ name: "evalJobExecutor" }, async () => {
          try {
            logger.info("Executing Evaluation Execution Job", job.data);
            await evaluate({ event: job.data.payload });
            return true;
          } catch (e) {
            const displayError =
              e instanceof BaseError ? e.message : "An internal error occurred";

            // 根据数据库类型选择不同的更新方式
            if (getDbType() === "dm8") {
              // DM8 模式：使用 Prisma ORM
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
            } else {
              // PostgreSQL 模式：使用 Kysely
              await kyselyPrisma.$kysely
                .updateTable("job_executions")
                .set("status", sql`'ERROR'::"JobExecutionStatus"`)
                .set("end_time", new Date())
                .set("error", displayError)
                .where("id", "=", job.data.payload.jobExecutionId)
                .where("project_id", "=", job.data.payload.projectId)
                .execute();
            }

            // do not log expected errors (api failures + missing api keys not provided by the user)
            if (
              !(e instanceof ApiError) &&
              !(
                e instanceof BaseError &&
                e.message.includes("API key for provider")
              )
            ) {
              logger.error(
                e,
                `Failed Evaluation_Execution job for id ${job.data.payload.jobExecutionId} ${e}`
              );
              Sentry.captureException(e);
            }

            throw e;
          }
        });
      },
      {
        connection: redis,
        concurrency: 10,
        limiter: {
          // execute 20 llm calls in 5 seconds
          max: 20,
          duration: 5_000,
        },
      }
    )
  : null;
