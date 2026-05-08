import DocPopup from "@/src/components/layouts/doc-popup";
import { RightAlignedCell } from "@/src/features/dashboard/components/RightAlignedCell";
import { DashboardCard } from "@/src/features/dashboard/components/cards/DashboardCard";
import { DashboardTable } from "@/src/features/dashboard/components/cards/DashboardTable";
import { type FilterState } from "@langfuse/shared";
import { api } from "@/src/utils/api";
import { compactNumberFormatter } from "@/src/utils/numbers";
import { TotalMetric } from "./TotalMetric";
import { totalCostDashboardFormatted } from "@/src/features/dashboard/lib/dashboard-utils";

import { env } from "@/src/env.mjs";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const MetricTable = ({
  className,
  projectId,
  globalFilterState,
}: {
  className: string;
  projectId: string;
  globalFilterState: FilterState;
}) => {
  const { t } = useLanguage();
  const metrics = api.dashboard.chart.useQuery(
    {
      projectId,
      from: env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION // Langfuse Cloud has already completed the cost backfill job, thus cost can be pulled directly from obs. table
        ? "traces_observations"
        : "traces_observationsview",
      select: [
        { column: "calculatedTotalCost", agg: "SUM" },
        { column: "totalTokens", agg: "SUM" },
        { column: "model" },
      ],
      filter: [
        ...globalFilterState,
        {
          type: "string",
          column: "type",
          operator: "=",
          value: "GENERATION",
        },
      ],
      groupBy: [{ type: "string", column: "model" }],
      orderBy: [
        { column: "calculatedTotalCost", direction: "DESC", agg: "SUM" },
      ],
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const totalTokenCost = metrics.data?.reduce(
    (acc, curr) =>
      acc +
      (curr.sumCalculatedTotalCost
        ? (curr.sumCalculatedTotalCost as number)
        : 0),
    0,
  );

  const metricsData = metrics.data
    ? metrics.data
      .filter((item) => item.model !== null)
      .map((item, i) => [
        item.model as string,
        <RightAlignedCell key={`${i}-tokens`}>
          {item.sumTotalTokens
            ? compactNumberFormatter(item.sumTotalTokens as number)
            : "0"}
        </RightAlignedCell>,
        <RightAlignedCell key={`${i}-cost`}>
          {item.sumCalculatedTotalCost
            ? totalCostDashboardFormatted(
              item.sumCalculatedTotalCost as number,
            )
            : "$0"}
        </RightAlignedCell>,
      ])
    : [];

  return (
    <DashboardCard
      className={className}
      title={t("dashboard.modelCostsTitle")}
      isLoading={metrics.isLoading}
    >
      <DashboardTable
        headers={[
          t("dashboard.modelHeader"),
          <RightAlignedCell key="tokens">{t("dashboard.tokensHeader")}</RightAlignedCell>,
          <RightAlignedCell key="cost">{t("dashboard.usdHeader")}</RightAlignedCell>,
        ]}
        rows={metricsData}
        collapse={{ collapsed: 5, expanded: 20 }}
      >
        <TotalMetric
          metric={totalCostDashboardFormatted(totalTokenCost)}
          description={t("dashboard.totalCost")}
        >
          <DocPopup
            description={t("dashboard.modelCostsDocDescription")}
          // href="https://langfuse.com/docs/model-usage-and-cost"
          />
        </TotalMetric>
      </DashboardTable>
    </DashboardCard>
  );
};
