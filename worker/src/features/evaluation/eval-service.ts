import { randomUUID } from "crypto";
import Handlebars from "handlebars";
import { z } from "zod";

import {
  ApiError,
  availableEvalVariables,
  ChatMessageRole,
  EvalExecutionEvent,
  evalTableCols,
  fetchLLMCompletion,
  ForbiddenError,
  LangfuseNotFoundError,
  LLMApiKeySchema,
  Prisma,
  QueueJobs,
  QueueName,
  singleFilter,
  tableColumnsToSqlFilterAndPrefix,
  TraceUpsertEventSchema,
  InvalidRequestError,
  variableMappingList,
  ZodModelConfig,
} from "@langfuse/shared";
import { decrypt } from "@langfuse/shared/encryption";
import { prisma } from "@langfuse/shared/src/db";

import logger from "../../logger";
import { evalQueue } from "../../queues/evalQueue";

// this function is used to determine which eval jobs to create for a given trace
// there might be multiple eval jobs to create for a single trace
export const createEvalJobs = async ({
  event,
}: {
  event: z.infer<typeof TraceUpsertEventSchema>;
}) => {
  const configs = await prisma.jobConfiguration.findMany({
    where: {
      jobType: "EVAL",
      projectId: event.projectId,
    },
  });

  if (configs.length === 0) {
    logger.debug("No evaluation jobs found for project", event.projectId);
    return;
  }
  logger.info("Creating eval jobs for trace", event.traceId);

  for (const config of configs) {
    if (config.status === "INACTIVE") {
      logger.info(`Skipping inactive config ${config.id}`);
      continue;
    }

    logger.info("Creating eval job for config", config.id);
    const validatedFilter = z.array(singleFilter).parse(config.filter);

    const condition = tableColumnsToSqlFilterAndPrefix(
      validatedFilter,
      evalTableCols,
      "traces"
    );

    const joinedQuery = Prisma.sql`
        SELECT id
        FROM traces as t
        WHERE project_id = ${event.projectId}
        AND id = ${event.traceId}
        ${condition}
      `;

    const traces = await prisma.$queryRaw<Array<{ id: string }>>(joinedQuery);

    const existingJob = await prisma.jobExecution.findFirst({
      where: {
        projectId: event.projectId,
        jobConfigurationId: config.id,
        jobInputTraceId: event.traceId,
      },
      select: { id: true },
    });

    // if we matched a trace, we might want to create a job
    if (traces.length > 0) {
      logger.info(
        `Eval job for config ${config.id} matched trace ids ${JSON.stringify(traces.map((t) => t.id))}`
      );

      const jobExecutionId = randomUUID();

      // deduplication: if a job exists already for a trace event, we do not create a new one.
      if (existingJob) {
        logger.info(
          `Eval job for config ${config.id} and trace ${event.traceId} already exists`
        );
        continue;
      }

      // apply sampling. Only if the job is sampled, we create a job
      // user supplies a number between 0 and 1, which is the probability of sampling

      if (parseFloat(config.sampling.toString()) !== 1) {
        const random = Math.random();
        if (random > parseFloat(config.sampling.toString())) {
          logger.info(
            `Eval job for config ${config.id} and trace ${event.traceId} was sampled out`
          );
          continue;
        }
      }

      logger.info(
        `Creating eval job for config ${config.id} and trace ${event.traceId}`
      );

      await prisma.jobExecution.create({
        data: {
          id: jobExecutionId,
          projectId: event.projectId,
          jobConfigurationId: config.id,
          jobInputTraceId: event.traceId,
          status: "PENDING",
          startTime: new Date(),
        },
      });

      // add the job to the next queue so that eval can be executed
      evalQueue?.add(
        QueueName.EvaluationExecution,
        {
          name: QueueJobs.EvaluationExecution,
          id: randomUUID(),
          timestamp: new Date(),
          payload: {
            projectId: event.projectId,
            jobExecutionId: jobExecutionId,
          },
        },
        {
          attempts: 10,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          delay: config.delay, // milliseconds
          removeOnComplete: true,
          removeOnFail: 10_000,
        }
      );
    } else {
      // if we do not have a match, and execution exists, we mark the job as cancelled
      // we do this, because a second trace event might 'deselect' a trace
      logger.debug(`Eval job for config ${config.id} did not match trace`);
      if (existingJob) {
        logger.info(
          `Cancelling eval job for config ${config.id} and trace ${event.traceId}`
        );
        await prisma.jobExecution.update({
          where: { id: existingJob.id },
          data: {
            status: "CANCELLED",
            endTime: new Date(),
          },
        });
      }
    }
  }
};

// for a single eval job, this function is used to evaluate the job
export const evaluate = async ({
  event,
}: {
  event: z.infer<typeof EvalExecutionEvent>;
}) => {
  logger.info(
    `Evaluating job ${event.jobExecutionId} for project ${event.projectId}`
  );
  // first, fetch all the context required for the evaluation
  const job = await prisma.jobExecution.findFirstOrThrow({
    where: {
      id: event.jobExecutionId,
      projectId: event.projectId,
    },
  });

  if (!job?.jobInputTraceId) {
    throw new ForbiddenError("Jobs can only be executed on traces for now.");
  }

  if (job.status === "CANCELLED") {
    logger.info(`Job ${job.id} for project ${event.projectId} was cancelled.`);

    await prisma.jobExecution.delete({
      where: {
        id: job.id,
        projectId: event.projectId,
      },
    });

    return;
  }

  const config = await prisma.jobConfiguration.findFirstOrThrow({
    where: {
      id: job.jobConfigurationId,
      projectId: event.projectId,
    },
  });

  if (!config.evalTemplateId) {
    throw new InvalidRequestError("Eval template ID not found in job configuration");
  }

  const template = await prisma.evalTemplate.findFirstOrThrow({
    where: {
      id: config.evalTemplateId,
      projectId: event.projectId,
    },
  });

  logger.info(
    `Evaluating job ${job.id} for project ${event.projectId} with template ${template.id}. Searching for context...`
  );

  // selectedcolumnid is not safe to use, needs validation in extractVariablesFromTrace()
  const parsedVariableMapping = variableMappingList.parse(
    config.variableMapping
  );

  // extract the variables which need to be inserted into the prompt
  const mappingResult = await extractVariablesFromTrace(
    event.projectId,
    template.vars,
    job.jobInputTraceId,
    parsedVariableMapping
  );

  logger.info(
    `Evaluating job ${event.jobExecutionId} extracted variables ${JSON.stringify(mappingResult)} `
  );

  // compile the prompt and send out the LLM request
  const prompt = compileHandlebarString(template.prompt, {
    ...Object.fromEntries(
      mappingResult.map(({ var: key, value }) => [key, value])
    ),
  });

  logger.info(`Compiled prompt ${prompt}`);

  const parsedOutputSchema = z
    .object({
      score: z.string(),
      reasoning: z.string(),
    })
    .parse(template.outputSchema);

  if (!parsedOutputSchema) {
    throw new InvalidRequestError("Output schema not found");
  }

  const openAIFunction = z.object({
    score: z.number().describe(parsedOutputSchema.score),
    reasoning: z.string().describe(parsedOutputSchema.reasoning),
  });

  const modelParams = ZodModelConfig.parse(template.modelParams);

  // the apiKey.secret_key must never be printed to the console or returned to the client.
  const apiKey = await prisma.llmApiKeys.findFirst({
    where: {
      projectId: event.projectId,
      provider: template.provider,
    },
  });
  const parsedKey = LLMApiKeySchema.safeParse(apiKey);

  if (!parsedKey.success) {
    // this will fail the eval execution if a user deletes the API key.
    throw new LangfuseNotFoundError(
      `API key for provider ${template.provider} and project ${event.projectId} not found.`
    );
  }

  let completion: string;
  try {
    completion = await fetchLLMCompletion({
      streaming: false,
      apiKey: decrypt(parsedKey.data.secretKey), // decrypt the secret key
      baseURL: parsedKey.data.baseURL || undefined,
      messages: [{ role: ChatMessageRole.System, content: prompt }],
      modelParams: {
        provider: template.provider,
        model: template.model,
        adapter: parsedKey.data.adapter,
        ...modelParams,
      },
      functionCall: {
        name: "evaluate",
        description: "some description",
        parameters: openAIFunction,
      },
    });
  } catch (e) {
    throw new ApiError(`Failed to fetch LLM completion: ${e}`);
  }

  const parsedLLMOutput = openAIFunction.parse(completion);

  logger.info(
    `Evaluating job ${event.jobExecutionId} Parsed LLM output ${JSON.stringify(parsedLLMOutput)}`
  );

  // persist the score and update the job status
  const scoreId = randomUUID();

  await prisma.score.create({
    data: {
      id: scoreId,
      traceId: job.jobInputTraceId,
      name: config.scoreName,
      value: parsedLLMOutput.score,
      comment: parsedLLMOutput.reasoning,
      source: "EVAL",
      projectId: event.projectId,
    },
  });

  logger.info(
    `Evaluating job ${event.jobExecutionId} persisted score ${scoreId} for trace ${job.jobInputTraceId}`
  );

  await prisma.jobExecution.update({
    where: { id: event.jobExecutionId },
    data: {
      status: "COMPLETED",
      endTime: new Date(),
      jobOutputScoreId: scoreId,
    },
  });

  logger.info(
    `Eval job ${job.id} for project ${event.projectId} completed with score ${parsedLLMOutput.score}`
  );
};

export function compileHandlebarString(
  handlebarString: string,
  context: Record<string, any>
): string {
  const template = Handlebars.compile(handlebarString, { noEscape: true });
  return template(context);
}

export async function extractVariablesFromTrace(
  projectId: string,
  variables: string[],
  traceId: string,
  // this here are variables which were inserted by users. Need to validate before DB query.
  variableMapping: z.infer<typeof variableMappingList>
) {
  const mappingResult: { var: string; value: string }[] = [];

  // find the context for each variable of the template
  for (const variable of variables) {
    const mapping = variableMapping.find(
      (m) => m.templateVariable === variable
    );

    if (!mapping) {
      logger.debug(`No mapping found for variable ${variable}`);
      mappingResult.push({ var: variable, value: "" });
      continue; // no need to fetch additional data
    }

    if (mapping.langfuseObject === "trace") {
      // find the internal definitions of the column
      const safeInternalColumn = availableEvalVariables
        .find((o) => o.id === "trace")
        ?.availableColumns.find((col) => col.id === mapping.selectedColumnId);

      // if no column was found, we still process with an empty variable
      if (!safeInternalColumn?.id) {
        logger.error(
          `No column found for variable ${variable} and column ${mapping.selectedColumnId}`
        );
        mappingResult.push({ var: variable, value: "" });
        continue;
      }

      // Use raw SQL with the internal column name
      const traceQuery = Prisma.sql`
        SELECT ${Prisma.raw(safeInternalColumn.internal)} as "${Prisma.raw(safeInternalColumn.id)}"
        FROM traces as t
        WHERE id = ${traceId}
        AND project_id = ${projectId}
      `;
      const traces = await prisma.$queryRaw<Array<Record<string, any>>>(traceQuery);
      const trace = traces[0];

      // user facing errors
      if (!trace) {
        logger.error(
          `Trace ${traceId} for project ${projectId} not found. Eval will succeed without trace input. Please ensure the mapped data on the trace exists and consider extending the job delay.`
        );
        throw new LangfuseNotFoundError(
          `Trace ${traceId} for project ${projectId} not found. Eval will succeed without trace input. Please ensure the mapped data on the trace exists and consider extending the job delay.`
        );
      }

      mappingResult.push({
        var: variable,
        value: parseUnknwnToString(trace[mapping.selectedColumnId]),
      });
    }
    if (["generation", "span", "event"].includes(mapping.langfuseObject)) {
      const safeInternalColumn = availableEvalVariables
        .find((o) => o.id === mapping.langfuseObject)
        ?.availableColumns.find((col) => col.id === mapping.selectedColumnId);

      if (!mapping.objectName) {
        logger.info(
          `No object name found for variable ${variable} and object ${mapping.langfuseObject}`
        );
        mappingResult.push({ var: variable, value: "" });
        continue;
      }

      if (!safeInternalColumn?.id) {
        logger.warn(
          `No column found for variable ${variable} and column ${mapping.selectedColumnId}`
        );
        mappingResult.push({ var: variable, value: "" });
        continue;
      }

      // Use raw SQL with the internal column name
      const observationQuery = Prisma.sql`
        SELECT ${Prisma.raw(safeInternalColumn.internal)} as "${Prisma.raw(safeInternalColumn.id)}"
        FROM observations as o
        WHERE trace_id = ${traceId}
        AND project_id = ${projectId}
        AND name = ${mapping.objectName}
        ORDER BY start_time DESC
        FETCH NEXT 1 ROWS ONLY
      `;
      const observations = await prisma.$queryRaw<Array<Record<string, any>>>(observationQuery);
      const observation = observations[0];

      // user facing errors
      if (!observation) {
        logger.error(
          `Observation ${mapping.objectName} for trace ${traceId} not found. Please ensure the mapped data exists and consider extending the job delay.`
        );
        throw new LangfuseNotFoundError(
          `Observation ${mapping.objectName} for trace ${traceId} not found. Please ensure the mapped data exists and consider extending the job delay.`
        );
      }

      mappingResult.push({
        var: variable,
        value: parseUnknwnToString(observation[mapping.selectedColumnId]),
      });
    }
  }
  return mappingResult;
}

export const parseUnknwnToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value.toString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  if (typeof value === "symbol") {
    return value.toString();
  }

  return String(value);
};
