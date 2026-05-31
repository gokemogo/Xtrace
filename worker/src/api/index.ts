import { randomUUID } from "crypto";
import express from "express";
import basicAuth from "express-basic-auth";
import * as Sentry from "@sentry/node";

import {
  EventBodySchema,
  EventName,
  QueueJobs,
  QueueName,
  TQueueJobTypes,
  TraceUpsertEventType,
} from "@langfuse/shared";
import { getDbType } from "@langfuse/shared/src/db-adapter/factory";

import { env } from "../env";
import logger from "../logger";
import { getEvalQueueInstance, getBatchExportQueueInstance } from "../queue-factory";
import emojis from "./emojis";
import { checkContainerHealth } from "../features/health";

// BullMQ 队列（仅在 PostgreSQL 模式下使用）
let bullmqEvalQueue: any = null;
let bullmqBatchExportQueue: any = null;

if (getDbType() === "postgresql") {
  try {
    const { Queue } = require("bullmq");
    const { redis } = require("../redis");
    if (redis) {
      bullmqEvalQueue = new Queue(QueueName.TraceUpsert, {
        connection: redis,
      });
      bullmqBatchExportQueue = require("../queues/batchExportQueue").batchExportQueue;
    }
  } catch (e) {
    logger.warn("Failed to initialize BullMQ queues, falling back to database queues");
  }
}

const router = express.Router();

type EventsResponse = {
  status: "success" | "error";
};

router.get<{}, { status: string }>("/health", async (_req, res) => {
  try {
    await checkContainerHealth(res);
  } catch (e) {
    logger.error(e, "Health check failed");
    res.status(500).json({
      status: "error",
    });
  }
});

router
  .use(
    basicAuth({
      users: { admin: env.LANGFUSE_WORKER_PASSWORD },
    })
  )
  .post<{}, EventsResponse>("/events", async (req, res) => {
    try {
      const { body } = req;
      logger.info(`Received events, ${JSON.stringify(body)}`);

      const event = EventBodySchema.safeParse(body);

      if (!event.success) {
        logger.error("Invalid event body", event.error);
        return res.status(400).json({
          status: "error",
        });
      }

      if (event.data.name === EventName.TraceUpsert) {
        // Find set of traces per project. There might be two events for the same trace in one API call.
        // If we don't deduplicate, we will end up processing the same trace twice on two different workers in parallel.
        const jobs = createQueueEvents(event.data.payload);

        if (getDbType() === "postgresql" && bullmqEvalQueue) {
          // PostgreSQL 模式：使用 BullMQ
          await bullmqEvalQueue.addBulk(jobs);
        } else {
          // DM8 模式：使用数据库队列
          const evalQueue = await getEvalQueueInstance();
          await evalQueue.addBulk(jobs);
        }

        return res.json({
          status: "success",
        });
      }

      if (event.data.name === EventName.BatchExport) {
        const jobData = {
          id: event.data.payload.batchExportId,
          name: QueueJobs.BatchExportJob,
          timestamp: new Date(),
          payload: event.data.payload,
        };

        if (getDbType() === "postgresql" && bullmqBatchExportQueue) {
          // PostgreSQL 模式：使用 BullMQ
          await bullmqBatchExportQueue.add(event.data.name, jobData);
        } else {
          // DM8 模式：使用数据库队列
          const batchExportQueue = await getBatchExportQueueInstance();
          await batchExportQueue.add(event.data.name, jobData);
        }

        return res.json({
          status: "success",
        });
      }

      return res.status(400);
    } catch (e) {
      logger.error(e, "Error processing events");
      Sentry.captureException(e);
      return res.status(500).json({
        status: "error",
      });
    }
  });

router.use("/emojis", emojis);

export default router;

export function createQueueEvents(events: TraceUpsertEventType[]) {
  const uniqueTracesPerProject = events.reduce((acc, event) => {
    if (!acc.get(event.projectId)) {
      acc.set(event.projectId, new Set());
    }
    acc.get(event.projectId)?.add(event.traceId);
    return acc;
  }, new Map<string, Set<string>>());

  const jobs = [...uniqueTracesPerProject.entries()]
    .map((tracesPerProject) => {
      const [projectId, traceIds] = tracesPerProject;

      return [...traceIds].map((traceId) => ({
        name: QueueJobs.TraceUpsert,
        data: {
          payload: {
            projectId,
            traceId,
          },
          id: randomUUID(),
          timestamp: new Date(),
          name: QueueJobs.TraceUpsert as const,
        },
        opts: {
          removeOnFail: 10000,
          removeOnComplete: true,
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      }));
    })
    .flat();
  return jobs;
}
