import "./instrumentation"; // this is required to make instrumentation work
import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import * as middlewares from "./middlewares";
import api from "./api";
import MessageResponse from "./interfaces/MessageResponse";

require("dotenv").config();

import logger from "./logger";
import { getDbType } from "@langfuse/shared/src/db-adapter/factory";
import { initializeQueues } from "./queue-factory";
import helmet from "helmet";

// BullMQ 队列（仅在 PostgreSQL 模式下使用）
let evalJobCreator: any = null;
let evalJobExecutor: any = null;
let batchExportJobExecutor: any = null;
let repeatQueueExecutor: any = null;

if (getDbType() === "postgresql") {
  // PostgreSQL 模式：导入 BullMQ 队列
  const evalQueueModule = require("./queues/evalQueue");
  evalJobCreator = evalQueueModule.evalJobCreator;
  evalJobExecutor = evalQueueModule.evalJobExecutor;

  const batchExportModule = require("./queues/batchExportQueue");
  batchExportJobExecutor = batchExportModule.batchExportJobExecutor;

  const repeatModule = require("./queues/repeatQueue");
  repeatQueueExecutor = repeatModule.repeatQueueExecutor;
}

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "Langfuse Worker API 🚀",
  });
});

app.use("/api", api);

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.expressErrorHandler());

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

// 初始化队列系统
initializeQueues().then(() => {
  logger.info("Queue system initialized successfully");

  if (getDbType() === "postgresql") {
    // PostgreSQL 模式：记录 BullMQ 队列状态
    logger.info("Eval Job Creator started", evalJobCreator?.isRunning());
    logger.info("Eval Job Executor started", evalJobExecutor?.isRunning());
    logger.info(
      "Batch Export Job Executor started",
      batchExportJobExecutor?.isRunning()
    );
    logger.info("Repeat Queue Executor started", repeatQueueExecutor?.isRunning());

    evalJobCreator?.on("failed", (job: any, err: any) => {
      logger.error(err, `Eval Job with id ${job?.id} failed with error ${err}`);
    });

    evalJobExecutor?.on("failed", (job: any, err: any) => {
      logger.error(
        err,
        `Eval execution Job with id ${job?.id} failed with error ${err}`
      );
    });

    batchExportJobExecutor?.on("failed", (job: any, err: any) => {
      logger.error(
        err,
        `Batch Export Job with id ${job?.id} failed with error ${err}`
      );
    });

    repeatQueueExecutor?.on("failed", (job: any, err: any) => {
      logger.error(
        err,
        `Repeat Queue Job with id ${job?.id} failed with error ${err}`
      );
    });
  } else {
    // DM8 模式：记录数据库队列状态
    logger.info("DM8 database queues started and running");
  }
}).catch((err) => {
  logger.error(err, "Failed to initialize queue system");
  Sentry.captureException(err);
});

export default app;
