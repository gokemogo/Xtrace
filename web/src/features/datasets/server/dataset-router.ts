import { z } from "zod";

import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import {
  type DatasetRuns,
  Prisma,
  type Dataset,
} from "@langfuse/shared/src/db";
import { throwIfNoAccess } from "@/src/features/rbac/utils/checkAccess";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { DB } from "@/src/server/db";
import { paginationZod, getDbType } from "@langfuse/shared";
import { filterAndValidateDbScoreList } from "@/src/features/public-api/types/scores";

export const datasetRouter = createTRPCRouter({
  allDatasetMeta: protectedProjectProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.dataset.findMany({
        where: {
          projectId: input.projectId,
        },
        select: {
          id: true,
          name: true,
        },
      });
    }),
  allDatasets: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        ...paginationZod,
      }),
    )
    .query(async ({ input, ctx }) => {
      const query = DB.selectFrom("datasets")
        .leftJoin("dataset_items", "datasets.id", "dataset_items.dataset_id")
        .leftJoin("dataset_runs", "datasets.id", "dataset_runs.dataset_id")
        .select(({ eb }) => [
          "datasets.id",
          "datasets.name",
          "datasets.description",
          "datasets.metadata",
          "datasets.created_at as createdAt",
          "datasets.updated_at as updatedAt",
          eb.fn.count("dataset_items.id").distinct().as("countDatasetItems"),
          eb.fn.count("dataset_runs.id").distinct().as("countDatasetRuns"),
          eb.fn.max("dataset_runs.created_at").as("lastRunAt"),
        ])
        .where("datasets.project_id", "=", input.projectId)
        .groupBy([
          "datasets.id",
          "datasets.name",
          "datasets.created_at",
          "datasets.updated_at",
        ])
        .orderBy("datasets.created_at", "desc")
        .limit(input.limit)
        .offset(input.page * input.limit);

      const compiledQuery = query.compile();

      const datasets = await ctx.prisma.$queryRawUnsafe<
        Array<
          Dataset & {
            countDatasetItems: number;
            countDatasetRuns: number;
            lastRunAt: Date | null;
          }
        >
      >(compiledQuery.sql, ...compiledQuery.parameters);

      const totalDatasets = await ctx.prisma.dataset.count({
        where: {
          projectId: input.projectId,
        },
      });

      return {
        totalDatasets,
        datasets,
      };
    }),
  byId: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
          projectId: input.projectId,
        },
      });
    }),
  runById: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        runId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.datasetRuns.findUnique({
        where: {
          id: input.runId,
          datasetId: input.datasetId,
          dataset: {
            projectId: input.projectId,
          },
        },
      });
    }),
  runsByDatasetId: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        ...paginationZod,
      }),
    )
    .query(async ({ input, ctx }) => {
      const dbType = getDbType();
      const runs = await ctx.prisma.$queryRaw<
        Array<
          DatasetRuns & {
            countRunItems: number;
            scores: Record<string, number>;
            avgLatency: number;
            avgTotalCost: Prisma.Decimal;
          }
        >
      >(dbType === "dm8"
        ? Prisma.sql`
        SELECT
          runs.id,
          runs.name,
          runs.description,
          runs.metadata,
          runs.created_at "createdAt",
          runs.updated_at "updatedAt",
          COALESCE(avg_scores.scores, '{}') scores,
          COALESCE(latency_and_total_cost."avgLatency", 0) "avgLatency",
          COALESCE(latency_and_total_cost."avgTotalCost", 0) "avgTotalCost",
          CAST(COALESCE(run_items_count.count, 0) AS INTEGER) "countRunItems"
        FROM
          dataset_runs runs
          JOIN datasets ON datasets.id = runs.dataset_id
          LEFT JOIN (
            SELECT
              ri.dataset_run_id,
              JSON_OBJECTAGG(s.name VALUE s.avg_value) AS scores
            FROM (
              SELECT
                ri.dataset_run_id,
                s.name,
                AVG(s.value) AS avg_value
              FROM
                dataset_run_items ri
                JOIN scores s
                  ON s.trace_id = ri.trace_id
                  AND (ri.observation_id IS NULL OR s.observation_id = ri.observation_id)
                  AND s.project_id = ${input.projectId}
                JOIN traces t ON t.id = s.trace_id
              WHERE
                t.project_id = ${input.projectId}
                AND s.data_type != 'CATEGORICAL'
                AND s.value IS NOT NULL
              GROUP BY ri.dataset_run_id, s.name
            ) s
            GROUP BY ri.dataset_run_id
          ) avg_scores ON avg_scores.dataset_run_id = runs.id
          LEFT JOIN (
            SELECT
              ri.dataset_run_id,
              AVG(o.latency) AS "avgLatency",
              AVG(COALESCE(o.calculated_total_cost, 0)) AS "avgTotalCost"
            FROM
              dataset_run_items ri
              JOIN observations_view o ON o.id = ri.observation_id
            WHERE
              o.project_id = ${input.projectId}
            GROUP BY ri.dataset_run_id
          ) latency_and_total_cost ON latency_and_total_cost.dataset_run_id = runs.id
          LEFT JOIN (
            SELECT ri.dataset_run_id, count(*) as count
            FROM dataset_run_items ri
            GROUP BY ri.dataset_run_id
          ) run_items_count ON run_items_count.dataset_run_id = runs.id
        WHERE
          runs.dataset_id = ${input.datasetId}
          AND datasets.project_id = ${input.projectId}
        ORDER BY
          runs.created_at DESC
        OFFSET ${input.page * input.limit} ROWS FETCH NEXT ${input.limit} ROWS ONLY
      `
        : Prisma.sql`
        SELECT
          runs.id,
          runs.name,
          runs.description,
          runs.metadata,
          runs.created_at "createdAt",
          runs.updated_at "updatedAt",
          COALESCE(avg_scores.scores, '{}') scores,
          COALESCE(latency_and_total_cost."avgLatency", 0) "avgLatency",
          COALESCE(latency_and_total_cost."avgTotalCost", 0) "avgTotalCost",
          COALESCE(run_items_count.count, 0)::int "countRunItems"
        FROM
          dataset_runs runs
          JOIN datasets ON datasets.id = runs.dataset_id
          LEFT JOIN LATERAL (
            SELECT
              jsonb_object_agg(s.name, s.avg_value) AS scores
            FROM (
              SELECT
                s.name,
                AVG(s.value) AS avg_value
              FROM
                dataset_run_items ri
                JOIN scores s
                  ON s.trace_id = ri.trace_id
                  AND (ri.observation_id IS NULL OR s.observation_id = ri.observation_id)
                  AND s.project_id = ${input.projectId}
                JOIN traces t ON t.id = s.trace_id
              WHERE
                t.project_id = ${input.projectId}
                AND s.data_type != 'CATEGORICAL'
                AND s.value IS NOT NULL
                AND ri.dataset_run_id = runs.id
              GROUP BY s.name
            ) s
          ) avg_scores ON true
          LEFT JOIN LATERAL (
            SELECT
              AVG(o.latency) AS "avgLatency",
              AVG(COALESCE(o.calculated_total_cost, 0)) AS "avgTotalCost"
            FROM
              dataset_run_items ri
              JOIN observations_view o ON o.id = ri.observation_id
            WHERE
              o.project_id = ${input.projectId}
              AND ri.dataset_run_id = runs.id
          ) latency_and_total_cost ON true
          LEFT JOIN LATERAL (
            SELECT count(*) as count
            FROM dataset_run_items ri
            WHERE ri.dataset_run_id = runs.id
          ) run_items_count ON true
        WHERE
          runs.dataset_id = ${input.datasetId}
          AND datasets.project_id = ${input.projectId}
        ORDER BY
          runs.created_at DESC
        LIMIT ${input.limit}
        OFFSET ${input.page * input.limit}
      `);

      const totalRuns = await ctx.prisma.datasetRuns.count({
        where: {
          datasetId: input.datasetId,
          dataset: {
            projectId: input.projectId,
          },
        },
      });

      return {
        totalRuns,
        runs,
      };
    }),
  itemById: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        datasetItemId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.datasetItem.findUnique({
        where: {
          id: input.datasetItemId,
          datasetId: input.datasetId,
          dataset: {
            projectId: input.projectId,
          },
        },
      });
    }),
  itemsByDatasetId: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        ...paginationZod,
      }),
    )
    .query(async ({ input, ctx }) => {
      const datasetItems = await ctx.prisma.datasetItem.findMany({
        where: {
          datasetId: input.datasetId,
          dataset: {
            projectId: input.projectId,
          },
        },
        orderBy: [
          {
            status: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: input.limit,
        skip: input.page * input.limit,
      });

      const totalDatasetItems = await ctx.prisma.datasetItem.count({
        where: {
          datasetId: input.datasetId,
          dataset: {
            projectId: input.projectId,
          },
        },
      });

      return {
        totalDatasetItems,
        datasetItems,
      };
    }),
  updateDatasetItem: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        datasetItemId: z.string(),
        input: z.string().optional(),
        expectedOutput: z.string().optional(),
        metadata: z.string().optional(),
        sourceTraceId: z.string().optional(),
        sourceObservationId: z.string().optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "datasets:CUD",
      });
      const datasetItem = await ctx.prisma.datasetItem.update({
        where: {
          id: input.datasetItemId,
          datasetId: input.datasetId,
          dataset: {
            projectId: input.projectId,
          },
        },
        data: {
          input:
            input.input === ""
              ? Prisma.DbNull
              : input.input !== undefined
                ? (JSON.parse(input.input) as Prisma.InputJsonObject)
                : undefined,
          expectedOutput:
            input.expectedOutput === ""
              ? Prisma.DbNull
              : input.expectedOutput !== undefined
                ? (JSON.parse(input.expectedOutput) as Prisma.InputJsonObject)
                : undefined,
          metadata:
            input.metadata === ""
              ? Prisma.DbNull
              : input.metadata !== undefined
                ? (JSON.parse(input.metadata) as Prisma.InputJsonObject)
                : undefined,
          sourceTraceId: input.sourceTraceId,
          sourceObservationId: input.sourceObservationId,
          status: input.status,
        },
      });
      await auditLog({
        session: ctx.session,
        resourceType: "datasetItem",
        resourceId: input.datasetItemId,
        projectId: input.projectId,
        action: "update",
        after: datasetItem,
      });
      return datasetItem;
    }),
  createDataset: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string(),
        description: z.string().nullish(),
        metadata: z.string().nullish(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "datasets:CUD",
      });
      const dataset = await ctx.prisma.dataset.create({
        data: {
          name: input.name,
          description: input.description ?? undefined,
          projectId: input.projectId,
          metadata:
            input.metadata === ""
              ? Prisma.DbNull
              : !!input.metadata
                ? (JSON.parse(input.metadata) as Prisma.InputJsonObject)
                : undefined,
        },
      });

      await auditLog({
        session: ctx.session,
        resourceType: "dataset",
        resourceId: dataset.id,
        projectId: input.projectId,
        action: "create",
        after: dataset,
      });

      return dataset;
    }),
  updateDataset: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        metadata: z.string().nullish(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "datasets:CUD",
      });
      const dataset = await ctx.prisma.dataset.update({
        where: {
          id: input.datasetId,
          projectId: input.projectId,
        },
        data: {
          name: input.name ?? undefined,
          description: input.description,
          metadata:
            input.metadata === ""
              ? Prisma.DbNull
              : !!input.metadata
                ? (JSON.parse(input.metadata) as Prisma.InputJsonObject)
                : undefined,
        },
      });
      await auditLog({
        session: ctx.session,
        resourceType: "dataset",
        resourceId: dataset.id,
        projectId: input.projectId,
        action: "update",
        after: dataset,
      });

      return dataset;
    }),
  deleteDataset: protectedProjectProcedure
    .input(z.object({ projectId: z.string(), datasetId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      throwIfNoAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "datasets:CUD",
      });
      const deletedDataset = await ctx.prisma.dataset.delete({
        where: {
          id: input.datasetId,
          projectId: input.projectId,
        },
      });
      await auditLog({
        session: ctx.session,
        resourceType: "dataset",
        resourceId: deletedDataset.id,
        projectId: input.projectId,
        action: "delete",
        before: deletedDataset,
      });
      return deletedDataset;
    }),
  createDatasetItem: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        datasetId: z.string(),
        input: z.string().nullish(),
        expectedOutput: z.string().nullish(),
        metadata: z.string().nullish(),
        sourceTraceId: z.string().optional(),
        sourceObservationId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "datasets:CUD",
      });
      const dataset = await ctx.prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
          projectId: input.projectId,
        },
      });
      if (!dataset) {
        throw new Error("Dataset not found");
      }

      const datasetItem = await ctx.prisma.datasetItem.create({
        data: {
          input:
            input.input === ""
              ? Prisma.DbNull
              : !!input.input
                ? (JSON.parse(input.input) as Prisma.InputJsonObject)
                : undefined,
          expectedOutput:
            input.expectedOutput === ""
              ? Prisma.DbNull
              : !!input.expectedOutput
                ? (JSON.parse(input.expectedOutput) as Prisma.InputJsonObject)
                : undefined,
          metadata:
            input.metadata === ""
              ? Prisma.DbNull
              : !!input.metadata
                ? (JSON.parse(input.metadata) as Prisma.InputJsonObject)
                : undefined,
          datasetId: input.datasetId,
          sourceTraceId: input.sourceTraceId,
          sourceObservationId: input.sourceObservationId,
        },
      });
      await auditLog({
        session: ctx.session,
        resourceType: "datasetItem",
        resourceId: datasetItem.id,
        projectId: input.projectId,
        action: "create",
        after: datasetItem,
      });
      return datasetItem;
    }),
  runitemsByRunIdOrItemId: protectedProjectProcedure
    .input(
      z
        .object({
          projectId: z.string(),
          datasetId: z.string(),
          datasetRunId: z.string().optional(),
          datasetItemId: z.string().optional(),
          ...paginationZod,
        })
        .refine(
          (input) => input.datasetRunId || input.datasetItemId,
          "Must provide either datasetRunId or datasetItemId",
        ),
    )
    .query(async ({ input, ctx }) => {
      const runItems = await ctx.prisma.datasetRunItems.findMany({
        where: {
          datasetRunId: input.datasetRunId,
          datasetItemId: input.datasetItemId,
          datasetRun: {
            dataset: {
              projectId: ctx.session.projectId,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit,
        skip: input.page * input.limit,
      });

      if (runItems.length === 0) return { totalRunItems: 0, runItems: [] };

      const traceScores = await ctx.prisma.score.findMany({
        where: {
          projectId: ctx.session.projectId,
          traceId: {
            in: runItems
              .filter((ri) => ri.observationId === null) // only include trace scores if run is not linked to an observation
              .map((ri) => ri.traceId),
          },
        },
      });
      const observationScores = await ctx.prisma.score.findMany({
        where: {
          projectId: ctx.session.projectId,
          observationId: {
            in: runItems
              .filter((ri) => ri.observationId !== null)
              .map((ri) => ri.observationId) as string[],
          },
        },
      });

      const totalRunItems = await ctx.prisma.datasetRunItems.count({
        where: {
          datasetRunId: input.datasetRunId,
          datasetItemId: input.datasetItemId,
          datasetRun: {
            dataset: {
              projectId: ctx.session.projectId,
            },
          },
        },
      });

      const observations = await ctx.prisma.observationView.findMany({
        where: {
          id: {
            in: runItems
              .map((ri) => ri.observationId)
              .filter(Boolean) as string[],
          },
          projectId: ctx.session.projectId,
        },
        select: {
          id: true,
          latency: true,
          calculatedTotalCost: true,
        },
      });

      // Directly access 'traces' table and calculate duration via lateral join
      // Previously used 'traces_view' was not performant enough
      const dbTypeLocal = getDbType();
      const traces = dbTypeLocal === "dm8"
        ? await ctx.prisma.$queryRaw<
            {
              id: string;
              duration: number;
            }[]
          >(
            Prisma.sql`
            SELECT
              t.id,
              o.duration
            FROM
              traces t
              LEFT JOIN (
                SELECT
                  o1.trace_id,
                  CAST(DATEDIFF(SECOND, min(o1.start_time), COALESCE(max(o1.end_time), max(o1.start_time))) AS DOUBLE PRECISION) AS duration
                FROM
                  observations o1
                WHERE
                  o1.project_id = ${input.projectId}
                  AND o1.trace_id IN (${Prisma.join(runItems.map((ri) => ri.traceId))})
                GROUP BY
                  o1.project_id,
                  o1.trace_id
              ) o ON o.trace_id = t.id
            WHERE
              t.project_id = ${input.projectId}
              AND t.id IN (${Prisma.join(runItems.map((ri) => ri.traceId))})
          `,
          )
        : await ctx.prisma.$queryRaw<
            {
              id: string;
              duration: number;
            }[]
          >(
            Prisma.sql`
            SELECT
              t.id,
              o.duration
            FROM
              traces t
              LEFT JOIN LATERAL (
                SELECT
                  EXTRACT(epoch FROM COALESCE(max(o1.end_time), max(o1.start_time)))::double precision - EXTRACT(epoch FROM min(o1.start_time))::double precision AS duration
                FROM
                  observations o1
                WHERE
                  o1.project_id = t.project_id
                  AND o1.trace_id = t.id
                GROUP BY
                  o1.project_id,
                  o1.trace_id) o ON TRUE
            WHERE
              t.project_id = ${input.projectId}
              AND t.id = ANY(ARRAY[${Prisma.join(runItems.map((ri) => ri.traceId))}])
          `,
          );

      const validatedTraceScores = filterAndValidateDbScoreList(traceScores);
      const validatedObservationScores =
        filterAndValidateDbScoreList(observationScores);

      const items = runItems.map((ri) => {
        return {
          id: ri.id,
          createdAt: ri.createdAt,
          datasetItemId: ri.datasetItemId,
          observation: observations.find((o) => o.id === ri.observationId),
          trace: traces.find((t) => t.id === ri.traceId),
          scores: [
            ...validatedTraceScores.filter((s) => s.traceId === ri.traceId),
            ...validatedObservationScores.filter(
              (s) =>
                s.observationId === ri.observationId &&
                s.traceId === ri.traceId,
            ),
          ],
        };
      });

      // Note: We early return in case of no run items, when adding parameters here, make sure to update the early return above
      return {
        totalRunItems,
        runItems: items,
      };
    }),
  datasetItemsBasedOnTraceOrObservation: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
        observationId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.datasetItem.findMany({
        where: {
          sourceTraceId: input.traceId,
          sourceObservationId: input.observationId ?? null, // null as it should not include observations from the same trace
          dataset: {
            projectId: input.projectId,
          },
        },
        select: {
          dataset: {
            select: {
              id: true,
              name: true,
            },
          },
          id: true,
        },
        orderBy: {
          dataset: {
            name: "asc",
          },
        },
      });
    }),
});
