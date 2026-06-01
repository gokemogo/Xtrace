import { type z } from "zod";

import { protectedProjectProcedure } from "@/src/server/api/trpc";
import { paginationZod, getDbType } from "@langfuse/shared";
import {
  type ObservationView,
  Prisma,
  type ScoreDataType,
} from "@langfuse/shared/src/db";

import { GenerationTableOptions } from "./utils/GenerationTableOptions";
import { getAllGenerations } from "@/src/server/api/routers/generations/db/getAllGenerationsSqlQuery";

const getAllGenerationsInput = GenerationTableOptions.extend({
  ...paginationZod,
});

export type ScoreSimplified = {
  name: string;
  value?: number | null;
  dataType: ScoreDataType;
  stringValue?: string | null;
  comment?: string | null;
};

export type GetAllGenerationsInput = z.infer<typeof getAllGenerationsInput>;

export type ObservationViewWithScores = ObservationView & {
  traceId: string | null;
  traceName: string | null;
  promptName: string | null;
  promptVersion: string | null;
  scores: ScoreSimplified[] | null;
};

export const getAllQuery = protectedProjectProcedure
  .input(getAllGenerationsInput)
  .query(async ({ input, ctx }) => {
    const { generations, datetimeFilter, filterCondition, searchCondition } =
      await getAllGenerations({ input, selectIOAndMetadata: false });

    const dbType = getDbType();
    const totalGenerations = await ctx.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(
      dbType === "dm8"
        ? Prisma.sql`
      SELECT
        count(*)
      FROM "observations_view" o
      JOIN "traces" t ON t.id = o.trace_id AND t.project_id = ${input.projectId}
      LEFT JOIN "prompts" p ON p.id = o.prompt_id AND p.project_id = ${input.projectId}
      LEFT JOIN (
        SELECT
          scores."trace_id",
          scores."observation_id",
          JSON_OBJECTAGG(scores.name VALUE CAST(avg_value AS DOUBLE PRECISION)) AS "scores_avg"
        FROM (
            SELECT
              "trace_id",
              "observation_id",
              name,
              avg(value) avg_value
            FROM
                "scores"
            WHERE
                scores."project_id" = ${input.projectId}
                AND scores.value IS NOT NULL
            GROUP BY
                "trace_id", "observation_id", name
        ) scores
        GROUP BY scores."trace_id", scores."observation_id"
      ) AS s_avg ON s_avg."trace_id" = t.id AND s_avg."observation_id" = o.id
      WHERE
        o.type = 'GENERATION'
        AND o.project_id = ${input.projectId}
        ${datetimeFilter}
        ${searchCondition}
        ${filterCondition}
    `
        : Prisma.sql`
      SELECT
        count(*)
      FROM "observations_view" o
      JOIN "traces" t ON t.id = o.trace_id AND t.project_id = ${input.projectId}
      LEFT JOIN "prompts" p ON p.id = o.prompt_id AND p.project_id = ${input.projectId}
      LEFT JOIN LATERAL (
        SELECT
          jsonb_object_agg(name::text, avg_value::double precision) AS "scores_avg"
        FROM (
            SELECT
              name,
              avg(value) avg_value
            FROM
                "scores"
            WHERE
                scores."project_id" = ${input.projectId}
                AND scores."trace_id" = t.id
                AND scores."observation_id" = o.id
                AND scores.value IS NOT NULL
            GROUP BY
                name
        ) tmp
      ) AS s_avg ON true
      WHERE
        o.type = 'GENERATION'
        AND o.project_id = ${input.projectId}
        ${datetimeFilter}
        ${searchCondition}
        ${filterCondition}
    `,
    );
    const count = totalGenerations[0]?.count;
    return {
      totalCount: count ? Number(count) : undefined,
      generations: generations,
    };
  });
