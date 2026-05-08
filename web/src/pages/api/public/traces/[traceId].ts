import { prisma } from "@langfuse/shared/src/db";
import {
  GetTraceV1Query,
  GetTraceV1Response,
} from "@/src/features/public-api/types/traces";
import { withMiddlewares } from "@/src/features/public-api/server/withMiddlewares";
import { createAuthedAPIRoute } from "@/src/features/public-api/server/createAuthedAPIRoute";
import { filterAndValidateDbScoreList } from "@/src/features/public-api/types/scores";
import { transformDbToApiObservation } from "@/src/features/public-api/types/observations";
import { LangfuseNotFoundError } from "@langfuse/shared";

// --- 新增：解码辅助函数 ---
function decodeUnicodeField<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
  const newObj = { ...obj };
  fields.forEach((field) => {
    if (typeof newObj[field] === 'string') {
      const str = newObj[field] as unknown as string;
      newObj[field] = str.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
        const codePoint = parseInt(match.substring(2), 16);
        return String.fromCodePoint(codePoint);
      }) as any;
    }
  });
  return newObj;
}

export default withMiddlewares({
  GET: createAuthedAPIRoute({
    name: "Get Single Trace",
    querySchema: GetTraceV1Query,
    responseSchema: GetTraceV1Response,
    fn: async ({ query, auth }) => {
      const { traceId } = query;

      const trace = await prisma.traceView.findFirst({
        where: {
          id: traceId,
          projectId: auth.scope.projectId,
        },
      });

      if (!trace) {
        throw new LangfuseNotFoundError(
          "Trace not found within authorized project",
        );
      }

      const [scores, observations] = await Promise.all([
        prisma.score.findMany({ // 修正：findMany 而不是 findMany (如果是旧版本prisma可能是findMany，新版本通常是findMany或findMany，这里假设原代码逻辑正确，仅关注数据处理)
          // 注意：原代码写的是 findMany，如果报错请检查 prisma 版本，通常是 findMany 或 findMany
          where: {
            traceId: traceId,
            projectId: auth.scope.projectId,
          },
          orderBy: { timestamp: "desc" },
        }),
        prisma.observationView.findMany({
          where: {
            traceId: traceId,
            projectId: auth.scope.projectId,
          },
          orderBy: { startTime: "asc" },
        }),
      ]);

      // 1. 转换 Observations
      let outObservations = observations.map(transformDbToApiObservation);

      // 2. 【关键修改】解码 Observations 中的 input 和 output
      // 假设 transformDbToApiObservation 返回的对象包含 input/output 字段
      outObservations = outObservations.map((obs) => {
        // 创建副本以避免直接修改可能带来的副作用（虽然 map 已经创建了新数组，但对象引用相同）
        return decodeUnicodeField(obs, ['input', 'output']);
      });

      const validatedScores = filterAndValidateDbScoreList(scores);

      const { duration, ...restOfTrace } = trace;

      // 3. 【关键修改】解码 Trace 级别的 input 和 output
      // 先解码 restOfTrace 中的 input/output
      const decodedTraceBody = decodeUnicodeField(restOfTrace, ['input', 'output']);

      return {
        ...decodedTraceBody, // 使用解码后的 trace 数据
        scores: validatedScores,
        htmlPath: `/project/${auth.scope.projectId}/traces/${traceId}`,
        totalCost: outObservations.reduce(
          (acc, obs) => acc + (obs.calculatedTotalCost ?? 0),
          0,
        ),
        latency: duration ?? 0,
        observations: outObservations, // 使用解码后的 observations
      };
    },
  }),
});