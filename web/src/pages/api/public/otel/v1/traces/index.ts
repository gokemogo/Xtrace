// src/pages/api/public/otel/v1/traces.ts

import { withMiddlewares } from "@/src/features/public-api/server/withMiddlewares";
import { createAuthedAPIRoute } from "@/src/features/public-api/server/createAuthedAPIRoute";
import {
  handleBatch,
  parseSingleTypedIngestionApiResponse,
} from "@/src/pages/api/public/ingestion";
import { PostTracesV1Response } from "@/src/features/public-api/types/traces";
import { telemetry } from "@/src/features/telemetry";
import { $root } from "@/src/pages/api/public/otel/otlp-proto/generated/root";
import { gunzip } from "node:zlib";
import { z } from "zod";
import { OtelIngestionProcessor } from "@langfuse/shared/src/server";

export const PostTracesV1Body = z.object({
  id: z.string().optional(), // 如果不传，后端会生成
  name: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  release: z.string().optional(),
  version: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  tags: z.array(z.string()).optional(),
});

export type PostTracesV1BodyType = z.infer<typeof PostTracesV1Body>;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withMiddlewares({
  POST: createAuthedAPIRoute({
    name: "OTel Trace Ingestion",
    querySchema: z.any(),
    responseSchema: z.any(),
    fn: async ({ req, res, auth }) => {
      await telemetry();

      // 1. 读取原始 body（和你原来一样）
      let body: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });

      // 2. 解压 gzip（和你原来一样）
      if (req.headers["content-encoding"]?.includes("gzip")) {
        body = await new Promise((resolve, reject) => {
          gunzip(body, (err, result) => (err ? reject(err) : resolve(result)));
        });
      }

      // 3. 解析为 resourceSpans（和你原来一样）
      const contentType = (req.headers["content-type"] || "").toLowerCase();
      let resourceSpans: any[] = [];

      if (contentType.includes("application/x-protobuf")) {
        try {
          const decoded =
            $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.decode(
              body,
            );
          const obj =
            $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.toObject(
              decoded,
              { arrays: true, objects: true, longs: String },
            );
          resourceSpans = obj.resourceSpans || [];
        } catch (e) {
          console.error("Protobuf decode error:", e);
          return res.status(400).json({ message: "Invalid OTLP Protobuf" });
        }
      } else if (contentType.includes("application/json")) {
        try {
          const json = JSON.parse(body.toString());
          resourceSpans = json.resourceSpans || [];
        } catch (e) {
          console.error("JSON parse error:", e);
          return res.status(400).json({ message: "Invalid OTLP JSON" });
        }
      } else {
        return res.status(400).json({ message: "Unsupported content type" });
      }

      if (!resourceSpans.length) {
        return res.status(200).json({ success: true, message: "No spans" });
      }

      // ✅ 关键：使用 Langfuse 官方处理器
      const processor = new OtelIngestionProcessor({
        projectId: auth.scope.projectId,
        publicKey: auth.publicKey, // 如果有
      });

      console.log(JSON.stringify(resourceSpans), "resourceSpans");
      // 处理成 ingestion events
      const ingestionEvents =
        await processor.processToIngestionEvents(resourceSpans);

      if (ingestionEvents.length === 0) {
        return res
          .status(200)
          .json({ success: true, message: "No events generated" });
      }
      console.log(JSON.stringify(ingestionEvents), "ingestionEvents");
      // 送入 ingestion pipeline
      const result = await handleBatch(ingestionEvents, {}, req, auth);
      const response = parseSingleTypedIngestionApiResponse(
        result.errors,
        result.results,
        PostTracesV1Response,
      );

      return response;
    },
  }),
});
