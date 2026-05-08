import DocPopup from "@/src/components/layouts/doc-popup";
import { NoData } from "@/src/features/dashboard/components/NoData";
import { DashboardCard } from "@/src/features/dashboard/components/cards/DashboardCard";
import { DashboardTable } from "@/src/features/dashboard/components/cards/DashboardTable";
import { type FilterState } from "@langfuse/shared";
import { api } from "@/src/utils/api";
import { compactNumberFormatter } from "@/src/utils/numbers";
import { RightAlignedCell } from "./RightAlignedCell";
import { TotalMetric } from "./TotalMetric";
import { createTracesTimeFilter } from "@/src/features/dashboard/lib/dashboard-utils";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const ScoresTable = ({
  className,
  projectId,
  globalFilterState,
}: {
  className: string;
  projectId: string;
  globalFilterState: FilterState;
}) => {
  const localFilters = createTracesTimeFilter(globalFilterState);
  const { t } = useLanguage();
  const metrics = api.dashboard.chart.useQuery(
    {
      projectId,
      from: "traces_scores",
      select: [
        { column: "scoreName" },
        { column: "scoreId", agg: "COUNT" },
        { column: "value", agg: "AVG" },
      ],
      filter: localFilters,
      groupBy: [{ type: "string", column: "scoreName" }],
      orderBy: [{ column: "scoreId", direction: "DESC", agg: "COUNT" }],
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const [zeroValueScores, oneValueScores] = [0, 1].map((i) =>
    api.dashboard.chart.useQuery(
      {
        projectId,
        from: "traces_scores",
        select: [{ column: "scoreName" }, { column: "scoreId", agg: "COUNT" }],
        filter: [
          ...localFilters,
          {
            column: "value",
            operator: "=",
            value: i,
            type: "number",
          },
        ],
        groupBy: [{ type: "string", column: "scoreName" }],
        orderBy: [{ column: "scoreId", direction: "DESC", agg: "COUNT" }],
      },
      {
        trpc: {
          context: {
            skipBatch: true,
          },
        },
      },
    ),
  );

  if (!zeroValueScores || !oneValueScores) {
    return (
      <DashboardCard title={t("dashboard.scoresTitle")} isLoading={false}>
        <NoData noDataText={t("dashboard.noData")} />
      </DashboardCard>
    );
  }

  const joinRequestData = () => {
    if (!metrics.data || !zeroValueScores.data || !oneValueScores.data)
      return [];

    return metrics.data.map((metric) => {
      const scoreName = metric.scoreName as string;

      const zeroValueScore = zeroValueScores.data.find(
        (item) => item.scoreName === scoreName,
      );
      const oneValueScore = oneValueScores.data.find(
        (item) => item.scoreName === scoreName,
      );

      return {
        scoreName: metric.scoreName as string,
        countScoreId: metric.countScoreId ? metric.countScoreId : 0,
        avgValue: metric.avgValue ? (metric.avgValue as number) : 0,
        zeroValueScore: zeroValueScore?.countScoreId
          ? zeroValueScore.countScoreId
          : 0,
        oneValueScore: oneValueScore?.countScoreId
          ? (oneValueScore.countScoreId as number)
          : 0,
      };
    });
  };

  const data = joinRequestData();

  const totalScores = data.reduce(
    (acc, curr) => acc + (curr.countScoreId as number),
    0,
  );

  return (
    <DashboardCard
      className={className}
      title={t("dashboard.scoresTitle")}
      isLoading={
        metrics.isLoading ||
        zeroValueScores.isLoading ||
        oneValueScores.isLoading
      }
    >
      <DashboardTable
        headers={[
          t("dashboard.nameHeader"),
          <RightAlignedCell key="count">{t("dashboard.countHeader")}</RightAlignedCell>,
          <RightAlignedCell key="average">{t("dashboard.avgHeader")}</RightAlignedCell>,
          <RightAlignedCell key="zero">{t("dashboard.zeroHeader")}</RightAlignedCell>,
          <RightAlignedCell key="one">{t("dashboard.oneHeader")}</RightAlignedCell>,
        ]}
        rows={data.map((item, i) => [
          item.scoreName,
          <RightAlignedCell key={`${i}-count`}>
            {compactNumberFormatter(item.countScoreId as number)}
          </RightAlignedCell>,
          <RightAlignedCell key={`${i}-average`}>
            {compactNumberFormatter(item.avgValue)}
          </RightAlignedCell>,
          <RightAlignedCell key={`${i}-zero`}>
            {compactNumberFormatter(item.zeroValueScore as number)}
          </RightAlignedCell>,
          <RightAlignedCell key={`${i}-one`}>
            {compactNumberFormatter(item.oneValueScore)}
          </RightAlignedCell>,
        ])}
        collapse={{ collapsed: 5, expanded: 20 }}
        noDataChildren={
          <DocPopup
            description={t("dashboard.scoresDocDescription")}
          // href="https://langfuse.com/docs/scores"
          />
        }
        noDataClassName="mt-0"
      >
        <TotalMetric
          metric={totalScores ? compactNumberFormatter(totalScores) : "0"}
          description={t("dashboard.totalScoresTracked")}
        />
      </DashboardTable>
    </DashboardCard>
  );
};
