import { prisma } from "@langfuse/shared/src/db";
import {
  PostTracesV1Body,
  GetTracesV1Query,
  GetTracesV1Response,
  PostTracesV1Response,
} from "@/src/features/public-api/types/traces";
import { withMiddlewares } from "@/src/features/public-api/server/withMiddlewares";
import { createAuthedAPIRoute } from "@/src/features/public-api/server/createAuthedAPIRoute";
import { Prisma } from "@langfuse/shared/src/db";
import {
  handleBatch,
  parseSingleTypedIngestionApiResponse,
} from "@/src/pages/api/public/ingestion";
import { type Trace, eventTypes } from "@langfuse/shared";
import { v4 } from "uuid";
import { telemetry } from "@/src/features/telemetry";
import { tracesTableCols, orderByToPrismaSql, getDbType } from "@langfuse/shared";

export default withMiddlewares({
  POST: createAuthedAPIRoute({
    name: "Create Trace",
    bodySchema: PostTracesV1Body,
    responseSchema: PostTracesV1Response, // Adjust this if you have a specific response schema
    fn: async ({ body, auth, req }) => {
      await telemetry();

      const event = {
        id: v4(),
        type: eventTypes.TRACE_CREATE,
        timestamp: new Date().toISOString(),
        body: body,
      };

      const result = await handleBatch([event], {}, req, auth);
      const response = parseSingleTypedIngestionApiResponse(
        result.errors,
        result.results,
        PostTracesV1Response,
      );
      return response;
    },
  }),

  GET: createAuthedAPIRoute({
    name: "Get Traces",
    querySchema: GetTracesV1Query,
    responseSchema: GetTracesV1Response,
    fn: async ({ query, auth }) => {
      const dbType = getDbType();
      const skipValue = (query.page - 1) * query.limit;
      const userCondition = query.userId
        ? Prisma.sql`AND t."user_id" = ${query.userId}`
        : Prisma.empty;
      const nameCondition = query.name
        ? Prisma.sql`AND t."name" = ${query.name}`
        : Prisma.empty;
      const tagsCondition = query.tags
        ? dbType === "dm8"
          ? Prisma.sql`AND EXISTS (SELECT 1 FROM JSON_TABLE(t."tags", '$[*]' COLUMNS (tag VARCHAR2(4000) PATH '$')) jt WHERE jt.tag IN (${Prisma.join(
              (Array.isArray(query.tags) ? query.tags : [query.tags]).map(
                (v) => Prisma.sql`${v}`,
              ),
              ", ",
            )}))`
          : Prisma.sql`AND ARRAY[${Prisma.join(
              (Array.isArray(query.tags) ? query.tags : [query.tags]).map(
                (v) => Prisma.sql`${v}`,
              ),
              ", ",
            )}] <@ t."tags"`
        : Prisma.empty;
      const sessionCondition = query.sessionId
        ? Prisma.sql`AND t."session_id" = ${query.sessionId}`
        : Prisma.empty;
      const fromTimestampCondition = query.fromTimestamp
        ? dbType === "dm8"
          ? Prisma.sql`AND t."timestamp" >= CAST(${query.fromTimestamp} AS TIMESTAMP WITH TIME ZONE)`
          : Prisma.sql`AND t."timestamp" >= ${query.fromTimestamp}::timestamp with time zone at time zone 'UTC'`
        : Prisma.empty;
      const toTimestampCondition = query.toTimestamp
        ? dbType === "dm8"
          ? Prisma.sql`AND t."timestamp" < CAST(${query.toTimestamp} AS TIMESTAMP WITH TIME ZONE)`
          : Prisma.sql`AND t."timestamp" < ${query.toTimestamp}::timestamp with time zone at time zone 'UTC'`
        : Prisma.empty;

      const orderByCondition = orderByToPrismaSql(
        query.orderBy ?? null,
        tracesTableCols,
      );

      const traces = dbType === "dm8"
        ? await prisma.$queryRaw<
            Array<
              Trace & {
                observations: string[];
                scores: string[];
                totalCost: number;
                latency: number;
                htmlPath: string;
              }
            >
          >(Prisma.sql`
            SELECT
              t.id,
              '/project/' || CAST(t.project_id AS VARCHAR2(36)) || '/traces/' || CAST(t.id AS VARCHAR2(36)) AS "htmlPath",
              t.timestamp,
              t.name,
              t.input,
              t.output,
              t.project_id as "projectId",
              t.session_id as "sessionId",
              t.metadata,
              t.external_id as "externalId",
              t.user_id as "userId",
              t.release,
              t.version,
              t.bookmarked,
              t.created_at as "createdAt",
              t.updated_at as "updatedAt",
              t.public,
              t.tags,
              COALESCE(o_agg."totalCost", 0) AS "totalCost",
              COALESCE(o_agg."latency", 0) AS "latency",
              COALESCE(o_agg."observations", '[]') AS "observations",
              COALESCE(s_agg."scores", '[]') AS "scores"
            FROM (
              SELECT *
              FROM "traces" t
              WHERE project_id = ${auth.scope.projectId}
              ${fromTimestampCondition}
              ${toTimestampCondition}
              ${userCondition}
              ${nameCondition}
              ${tagsCondition}
              ${sessionCondition}
              ${orderByCondition}
              OFFSET ${skipValue} ROWS FETCH NEXT ${query.limit} ROWS ONLY
            ) t
            LEFT JOIN (
              SELECT
                o.trace_id,
                SUM(o.calculated_total_cost) AS "totalCost",
                DATEDIFF(SECOND, MIN(o."start_time"), COALESCE(MAX(o."end_time"), MAX(o."start_time"))) AS "latency",
                JSON_ARRAYAGG(o.id) AS "observations"
              FROM "observations_view" AS o
              WHERE o.project_id = ${auth.scope.projectId}
                AND o.id IS NOT NULL
              GROUP BY o.trace_id
            ) o_agg ON o_agg.trace_id = t.id
            LEFT JOIN (
              SELECT
                s.trace_id,
                JSON_ARRAYAGG(s.id) AS "scores"
              FROM "scores" AS s
              WHERE s.project_id = ${auth.scope.projectId}
                AND s.id IS NOT NULL
              GROUP BY s.trace_id
            ) s_agg ON s_agg.trace_id = t.id
          `)
        : await prisma.$queryRaw<
            Array<
              Trace & {
                observations: string[];
                scores: string[];
                totalCost: number;
                latency: number;
                htmlPath: string;
              }
            >
          >(Prisma.sql`
            SELECT
              t.id,
              '/project/' || t.project_id::TEXT || '/traces/' || t.id::TEXT AS "htmlPath",
              t.timestamp,
              t.name,
              t.input,
              t.output,
              t.project_id as "projectId",
              t.session_id as "sessionId",
              t.metadata,
              t.external_id as "externalId",
              t.user_id as "userId",
              t.release,
              t.version,
              t.bookmarked,
              t.created_at as "createdAt",
              t.updated_at as "updatedAt",
              t.public,
              t.tags,
              COALESCE(o."totalCost", 0)::DOUBLE PRECISION AS "totalCost",
              COALESCE(o."latency", 0)::double precision AS "latency",
              COALESCE(o."observations", ARRAY[]::text[]) AS "observations",
              COALESCE(s."scores", ARRAY[]::text[]) AS "scores"
            FROM (
              SELECT *
              FROM "traces" t
              WHERE project_id = ${auth.scope.projectId}
              ${fromTimestampCondition}
              ${toTimestampCondition}
              ${userCondition}
              ${nameCondition}
              ${tagsCondition}
              ${sessionCondition}
              ${orderByCondition}
              LIMIT ${query.limit} OFFSET ${skipValue}
            ) AS t
            LEFT JOIN LATERAL (
              SELECT
                SUM(o.calculated_total_cost)::DOUBLE PRECISION AS "totalCost",
                EXTRACT(EPOCH FROM COALESCE(MAX(o."end_time"), MAX(o."start_time"))) - EXTRACT(EPOCH FROM MIN(o."start_time"))::DOUBLE PRECISION AS "latency",
                ARRAY_AGG(DISTINCT o.id) FILTER (WHERE o.id IS NOT NULL) AS "observations"
              FROM "observations_view" AS o
              WHERE o.trace_id = t.id AND o.project_id = ${auth.scope.projectId}
            ) AS o ON true
            LEFT JOIN LATERAL (
              SELECT
                ARRAY_AGG(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL) AS "scores"
              FROM "scores" AS s
              WHERE s.trace_id = t.id AND s.project_id = ${auth.scope.projectId}
            ) AS s ON true
          `);

      const totalItems = await prisma.trace.count({
        where: {
          projectId: auth.scope.projectId,
          name: query.name ? query.name : undefined,
          userId: query.userId ? query.userId : undefined,
          sessionId: query.sessionId ? query.sessionId : undefined,
          timestamp: {
            gte: query.fromTimestamp
              ? new Date(query.fromTimestamp)
              : undefined,
            lt: query.toTimestamp ? new Date(query.toTimestamp) : undefined,
          },
          tags: query.tags
            ? {
                hasEvery: Array.isArray(query.tags) ? query.tags : [query.tags],
              }
            : undefined,
        },
      });

      return {
        data: traces,
        meta: {
          page: query.page,
          limit: query.limit,
          totalItems,
          totalPages: Math.ceil(totalItems / query.limit),
        },
      };
    },
  }),
});
