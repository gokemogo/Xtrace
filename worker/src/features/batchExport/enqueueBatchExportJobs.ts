import { BatchExportStatus, QueueJobs } from "@langfuse/shared";
import { prisma, kyselyPrisma } from "@langfuse/shared/src/db";
import { getDbType } from "@langfuse/shared/src/db-adapter/factory";
import * as Sentry from "@sentry/node";

import logger from "../../logger";
import { getBatchExportQueueInstance } from "../../queue-factory";

/**
 * Enqueues batch export jobs from the database to the job queue.
 *
 * @returns A promise that resolves when the jobs are enqueued successfully.
 */
export async function enqueueBatchExportJobs() {
  try {
    const dbType = getDbType();
    let queuedJobs: any[];

    if (dbType === "dm8") {
      // DM8 模式：使用 Prisma ORM
      queuedJobs = await prisma.batchExport.findMany({
        where: { status: BatchExportStatus.QUEUED },
      });
    } else {
      // PostgreSQL 模式：使用 Kysely
      queuedJobs = await kyselyPrisma.$kysely
        .selectFrom("batch_exports")
        .selectAll()
        .where("status", "=", BatchExportStatus.QUEUED)
        .execute();
    }

    const batchExportQueue = await getBatchExportQueueInstance();
    if (batchExportQueue) {
      const newJobs = queuedJobs.map(
        (job: any) =>
          ({
            name: QueueJobs.BatchExportJob,
            data: {
              id: job.id, // Important to deduplicate when the same job is already in the queue
              name: QueueJobs.BatchExportJob,
              timestamp: new Date(),
              payload: {
                batchExportId: job.id,
                projectId: job.project_id ?? job.projectId,
              },
            },
          }) as const
      );

      await batchExportQueue.addBulk(newJobs);
      logger.info(`Enqueued ${newJobs.length} batch export jobs from ${dbType}`);
    }
  } catch (error) {
    logger.error(
      "Error while checking for QUEUED batch export jobs",
      error
    );
    Sentry.captureException(error);
  }
}
