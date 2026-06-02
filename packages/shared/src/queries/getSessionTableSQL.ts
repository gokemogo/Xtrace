import { z } from "zod";

import { Prisma } from "@prisma/client";
import { tableColumnsToSqlFilterAndPrefix } from "../filterToPrisma";
import { singleFilter } from "../interfaces/filters";
import { orderBy } from "../interfaces/orderBy";
import { orderByToPrismaSql } from "../orderByToPrisma";
import { sessionsViewCols } from "../tableDefinitions/index";
import { getDbType } from "../db-adapter";

const GetSessionTableSQLParamsSchema = z.object({
  projectId: z.string(),
  filter: z.array(singleFilter).nullable(),
  orderBy: orderBy,
  page: z.number(),
  limit: z.number(),
});
type GetSessionTableSQLParams = z.infer<typeof GetSessionTableSQLParamsSchema>;

export const getSessionTableSQL = (
  params: GetSessionTableSQLParams
): Prisma.Sql => {
  const { projectId, filter, orderBy, page, limit } =
    GetSessionTableSQLParamsSchema.parse(params);

  const dbType = getDbType();

  const filterCondition = tableColumnsToSqlFilterAndPrefix(
    filter ?? [],
    sessionsViewCols,
    "sessions"
  );
  const orderByCondition = orderByToPrismaSql(orderBy, sessionsViewCols);

  if (dbType === "dm8") {
    // DM8 版本：使用 JSON_ARRAYAGG 和子查询替代 LATERAL JOIN
    const sql = Prisma.sql`
      SELECT
        s.id,
        s."created_at" AS "createdAt",
        s.bookmarked,
        s.public,
        t."userIds",
        t."countTraces",
        o."sessionDuration",
        o."totalCost" AS "totalCost",
        o."inputCost" AS "inputCost",
        o."outputCost" AS "outputCost",
        o."promptTokens" AS "promptTokens",
        o."completionTokens" AS "completionTokens",
        o."totalTokens" AS "totalTokens",
        (COUNT(*) OVER()) AS "totalCount"
      FROM
        trace_sessions s
        LEFT JOIN (
          SELECT
            t.session_id,
            MAX(t."timestamp") AS "max_timestamp",
            MIN(t."timestamp") AS "min_timestamp",
            JSON_ARRAYAGG(t.id) AS "traceIds",
            JSON_ARRAYAGG(DISTINCT t.user_id) AS "userIds",
            COUNT(t.id) AS "countTraces"
          FROM traces t
          WHERE t.project_id = ${projectId}
          GROUP BY t.session_id
        ) t ON t.session_id = s.id
        LEFT JOIN (
          SELECT
            t2.session_id,
            DATEDIFF(SS,
              MIN(o2."start_time"),
              COALESCE(MAX(o2."end_time"), MAX(o2."start_time"))
            ) AS "sessionDuration",
            SUM(COALESCE(o2."calculated_input_cost", 0)) AS "inputCost",
            SUM(COALESCE(o2."calculated_output_cost", 0)) AS "outputCost",
            SUM(COALESCE(o2."calculated_total_cost", 0)) AS "totalCost",
            SUM(o2.prompt_tokens) AS "promptTokens",
            SUM(o2.completion_tokens) AS "completionTokens",
            SUM(o2.total_tokens) AS "totalTokens"
          FROM observations_view o2
          JOIN traces t2 ON o2.trace_id = t2.id AND o2.project_id = t2.project_id
          WHERE o2.project_id = ${projectId}
          GROUP BY t2.session_id
        ) o ON o.session_id = s.id
      WHERE
        s."project_id" = ${projectId}
        ${filterCondition}
      ${orderByCondition}
      OFFSET ${page * limit} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    return sql;
  }

  // PostgreSQL 版本：使用 LEFT JOIN LATERAL
  const sql = Prisma.sql`
      SELECT
        s.id,
        s. "created_at" AS "createdAt",
        s.bookmarked,
        s.public,
        t. "userIds",
        t. "countTraces",
        o. "sessionDuration",
        o. "totalCost" AS "totalCost",
        o. "inputCost" AS "inputCost",
        o. "outputCost" AS "outputCost",
        o. "promptTokens" AS "promptTokens",
        o. "completionTokens" AS "completionTokens",
        o. "totalTokens" AS "totalTokens",
        (count(*) OVER ())::int AS "totalCount"
      FROM
        trace_sessions AS s
        LEFT JOIN LATERAL (
          SELECT
            t.session_id,
            MAX(t. "timestamp") AS "max_timestamp",
            MIN(t. "timestamp") AS "min_timestamp",
            array_agg(t.id) AS "traceIds",
            array_agg(DISTINCT t.user_id) AS "userIds",
            count(t.id)::int AS "countTraces"
          FROM
            traces t
          WHERE
            t.project_id = ${projectId}
            AND t.session_id = s.id
          GROUP BY
            t.session_id) AS t ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            EXTRACT(EPOCH FROM COALESCE(MAX(o. "end_time"), MAX(o. "start_time"), t. "max_timestamp")) - EXTRACT(EPOCH FROM COALESCE(MIN(o. "start_time"), t. "min_timestamp"))::double precision AS "sessionDuration",
            SUM(COALESCE(o. "calculated_input_cost", 0)) AS "inputCost",
            SUM(COALESCE(o. "calculated_output_cost", 0)) AS "outputCost",
            SUM(COALESCE(o. "calculated_total_cost", 0)) AS "totalCost",
            SUM(o.prompt_tokens) AS "promptTokens",
            SUM(o.completion_tokens) AS "completionTokens",
            SUM(o.total_tokens) AS "totalTokens"
          FROM
            observations_view o
          WHERE
            o.project_id = ${projectId}
            AND o.trace_id = ANY (t. "traceIds")) AS o ON TRUE
      WHERE
        s. "project_id" = ${projectId}
        ${filterCondition}
      ${orderByCondition}
      LIMIT ${limit}
      OFFSET ${page * limit}
    `;

  return sql;
};
