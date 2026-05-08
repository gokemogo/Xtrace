import { GroupedScoreBadges } from "@/src/components/grouped-score-badge";
import { StarTraceToggle } from "@/src/components/star-toggle";
import { DataTable } from "@/src/components/table/data-table";
import { TraceTableMultiSelectAction } from "@/src/components/table/data-table-multi-select-actions/trace-table-multi-select-action";
import { DataTableToolbar } from "@/src/components/table/data-table-toolbar";
import TableLink from "@/src/components/table/table-link";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import { TagTracePopover } from "@/src/features/tag/components/TagTracePopver";
import { TokenUsageBadge } from "@/src/components/token-usage-badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import useColumnVisibility from "@/src/features/column-visibility/hooks/useColumnVisibility";
import { useQueryFilterState } from "@/src/features/filters/hooks/useFilterState";
import { api } from "@/src/utils/api";
import {
  formatIntervalSeconds,
  localtimeDateOffsetByDays,
} from "@/src/utils/dates";
import { type RouterInput, type RouterOutput } from "@/src/utils/types";
import { type RowSelectionState } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  NumberParam,
  StringParam,
  useQueryParam,
  useQueryParams,
  withDefault,
} from "use-query-params";
import type Decimal from "decimal.js";
import { numberFormatter, usdFormatter } from "@/src/utils/numbers";
import { DeleteButton } from "@/src/components/deleteButton";
import { LevelColors } from "@/src/components/level-colors";
import { cn } from "@/src/utils/tailwind";
import { useDetailPageLists } from "@/src/features/navigate-detail-pages/context";
import { useOrderByState } from "@/src/features/orderBy/hooks/useOrderByState";
import {
  type FilterState,
  type TraceOptions,
  tracesTableColsWithOptions,
  type ObservationLevel,
} from "@langfuse/shared";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { useRowHeightLocalStorage } from "@/src/components/table/data-table-row-height-switch";
import { IOTableCell } from "@/src/components/ui/CodeJsonViewer";
import { useTableLookBackDays } from "@/src/hooks/useTableLookBackDays";
import { type APIScore } from "@/src/features/public-api/types/scores";

export type TracesTableRow = {
  bookmarked: boolean;
  id: string;
  timestamp: string;
  name: string;
  userId: string;
  level: ObservationLevel;
  observationCount: number;
  latency?: number;
  release?: string;
  version?: string;
  sessionId?: string;
  // i/o and metadata not set explicitly, but fetched from the server from the cell
  input?: unknown;
  output?: unknown;
  metadata?: unknown;
  scores: APIScore[];
  tags: string[];
  usage: {
    promptTokens: bigint;
    completionTokens: bigint;
    totalTokens: bigint;
  };
  inputCost?: Decimal;
  outputCost?: Decimal;
  totalCost?: Decimal;
};

export type TracesTableProps = {
  projectId: string;
  userId?: string;
  omittedFilter?: string[];
};

export type TraceFilterInput = Omit<RouterInput["traces"]["all"], "projectId">;

export default function TracesTable({
  projectId,
  userId,
  omittedFilter = [],
}: TracesTableProps) {
  const utils = api.useUtils();
  const { t } = useLanguage();
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const { setDetailPageList } = useDetailPageLists();
  const [searchQuery, setSearchQuery] = useQueryParam(
    "search",
    withDefault(StringParam, null),
  );

  const [userFilterState, setUserFilterState] = useQueryFilterState(
    [
      {
        column: "Timestamp",
        type: "datetime",
        operator: ">",
        value: localtimeDateOffsetByDays(-useTableLookBackDays(projectId)),
      },
    ],
    "traces",
  );
  const [orderByState, setOrderByState] = useOrderByState({
    column: "timestamp",
    order: "DESC",
  });

  const userIdFilter: FilterState = userId
    ? [
      {
        column: "User ID",
        type: "string",
        operator: "=",
        value: userId,
      },
    ]
    : [];

  const filterState = userFilterState.concat(userIdFilter);
  const [paginationState, setPaginationState] = useQueryParams({
    pageIndex: withDefault(NumberParam, 0),
    pageSize: withDefault(NumberParam, 50),
  });
  const tracesAllQueryFilter = {
    page: paginationState.pageIndex,
    limit: paginationState.pageSize,
    projectId,
    filter: filterState,
    searchQuery,
    orderBy: orderByState,
  };
  const traces = api.traces.all.useQuery(tracesAllQueryFilter);

  const totalCount = traces.data?.totalCount ?? 0;
  useEffect(() => {
    if (traces.isSuccess) {
      setDetailPageList(
        "traces",
        traces.data.traces.map((t) => t.id),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traces.isSuccess, traces.data]);

  // loading filter options individually from the remaining calls
  // traces.all should load first together with everything else.
  // This here happens in the background.
  const timestampFilter = filterState.find((f) => f.column === "Timestamp");
  const traceFilterOptions = api.traces.filterOptions.useQuery(
    {
      projectId,
      timestampFilter:
        timestampFilter?.type === "datetime" ? timestampFilter : undefined,
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const transformFilterOptions = (
    traceFilterOptions: TraceOptions | undefined,
  ) => {
    return tracesTableColsWithOptions(traceFilterOptions).filter(
      (c) => !omittedFilter?.includes(c.name),
    );
  };

  const convertToTableRow = (
    trace: RouterOutput["traces"]["all"]["traces"][0],
  ): TracesTableRow => {
    return {
      bookmarked: trace.bookmarked,
      id: trace.id,
      timestamp: trace.timestamp.toLocaleString(),
      name: trace.name ?? "",
      level: trace.level,
      observationCount: trace.observationCount,
      release: trace.release ?? undefined,
      version: trace.version ?? undefined,
      userId: trace.userId ?? "",
      scores: trace.scores,
      sessionId: trace.sessionId ?? undefined,
      latency: trace.latency === null ? undefined : trace.latency,
      tags: trace.tags,
      usage: {
        promptTokens: trace.promptTokens,
        completionTokens: trace.completionTokens,
        totalTokens: trace.totalTokens,
      },
      inputCost: trace.calculatedInputCost ?? undefined,
      outputCost: trace.calculatedOutputCost ?? undefined,
      totalCost: trace.calculatedTotalCost ?? undefined,
    };
  };

  const [rowHeight, setRowHeight] = useRowHeightLocalStorage("traces", "s");

  const columns: LangfuseColumnDef<TracesTableRow>[] = [
    {
      id: "select",
      accessorKey: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            if (!value) {
              setSelectedRows({});
            }
          }}
          aria-label={t("table.selectAll")}
          className="mt-1 opacity-60 data-[state=checked]:mt-[6px] data-[state=indeterminate]:mt-[6px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("table.selectRow")}
          className="mt-1 opacity-60 data-[state=checked]:mt-[5px]"
        />
      ),
    },
    {
      accessorKey: "bookmarked",
      header: undefined,
      id: "bookmarked",
      cell: ({ row }) => {
        const bookmarked: TracesTableRow["bookmarked"] =
          row.getValue("bookmarked");
        const traceId = row.getValue("id");
        return typeof traceId === "string" &&
          typeof bookmarked === "boolean" ? (
          <StarTraceToggle
            tracesFilter={tracesAllQueryFilter}
            traceId={traceId}
            projectId={projectId}
            value={bookmarked}
            size="xs"
          />
        ) : undefined;
      },
      enableSorting: true,
    },
    {
      accessorKey: "id",
      header: t("table.id"),
      id: "id",
      cell: ({ row }) => {
        const value: TracesTableRow["id"] = row.getValue("id");
        return value && typeof value === "string" ? (
          <TableLink
            path={`/project/${projectId}/traces/${value}`}
            value={value}
          />
        ) : undefined;
      },
      enableSorting: true,
    },
    {
      accessorKey: "timestamp",
      header: t("table.timestamp"),
      id: "timestamp",
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: t("table.name"),
      id: "name",
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: "userId",
      header: t("table.userId"),
      id: "userId",
      cell: ({ row }) => {
        const value: TracesTableRow["userId"] = row.getValue("userId");
        return value && typeof value === "string" ? (
          <TableLink
            path={`/project/${projectId}/users/${encodeURIComponent(value)}`}
            value={value}
            truncateAt={40}
          />
        ) : undefined;
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: "sessionId",
      enableColumnFilter: !omittedFilter.find((f) => f === "sessionId"),
      id: "sessionId",
      header: t("table.sessionId"),
      cell: ({ row }) => {
        const value: TracesTableRow["sessionId"] = row.getValue("sessionId");
        return value && typeof value === "string" ? (
          <TableLink
            path={`/project/${projectId}/sessions/${encodeURIComponent(value)}`}
            value={value}
            truncateAt={40}
          />
        ) : undefined;
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: "latency",
      id: "latency",
      header: t("table.latency"),
      // add seconds to the end of the latency
      cell: ({ row }) => {
        const value: TracesTableRow["latency"] = row.getValue("latency");
        return value !== undefined ? formatIntervalSeconds(value) : undefined;
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: "inputTokens",
      id: "inputTokens",
      header: t("table.inputTokens"),
      cell: ({ row }) => {
        const value: TracesTableRow["usage"] = row.getValue("usage");
        return <span>{numberFormatter(value.promptTokens, 0)}</span>;
      },
      enableHiding: true,
      defaultHidden: true,
      enableSorting: true,
    },
    {
      accessorKey: "outputTokens",
      id: "outputTokens",
      header: t("table.outputTokens"),
      cell: ({ row }) => {
        const value: TracesTableRow["usage"] = row.getValue("usage");
        return <span>{numberFormatter(value.completionTokens, 0)}</span>;
      },
      enableHiding: true,
      defaultHidden: true,
      enableSorting: true,
    },
    {
      accessorKey: "totalTokens",
      id: "totalTokens",
      header: t("table.totalTokens"),
      cell: ({ row }) => {
        const value: TracesTableRow["usage"] = row.getValue("usage");
        return <span>{numberFormatter(value.totalTokens, 0)}</span>;
      },
      enableHiding: true,
      defaultHidden: true,
      enableSorting: true,
    },
    {
      // TODO: Enable Ordering By Usage (not covered by API yet)
      accessorKey: "usage",
      header: t("table.usage"),
      id: "usage",
      cell: ({ row }) => {
        const value: TracesTableRow["usage"] = row.getValue("usage");
        return (
          <TokenUsageBadge
            promptTokens={value.promptTokens}
            completionTokens={value.completionTokens}
            totalTokens={value.totalTokens}
            inline
          />
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "inputCost",
      id: "inputCost",
      header: t("table.inputCost"),
      cell: ({ row }) => {
        const cost: TracesTableRow["inputCost"] = row.getValue("inputCost");
        return (
          <div>
            {cost ? (
              <span>{usdFormatter(cost.toNumber())}</span>
            ) : (
              <span>-</span>
            )}
          </div>
        );
      },
      enableHiding: true,
      defaultHidden: true,
      enableSorting: true,
    },
    {
      accessorKey: "outputCost",
      id: "outputCost",
      header: t("table.outputCost"),
      cell: ({ row }) => {
        const cost: TracesTableRow["outputCost"] = row.getValue("outputCost");
        return (
          <div>
            {cost ? (
              <span>{usdFormatter(cost.toNumber())}</span>
            ) : (
              <span>-</span>
            )}
          </div>
        );
      },
      enableHiding: true,
      defaultHidden: true,
      enableSorting: true,
    },
    {
      accessorKey: "totalCost",
      id: "totalCost",
      header: t("table.totalCost"),
      cell: ({ row }) => {
        const cost: TracesTableRow["totalCost"] = row.getValue("totalCost");
        return (
          <div>
            {cost ? (
              <span>{usdFormatter(cost.toNumber())}</span>
            ) : (
              <span>-</span>
            )}
          </div>
        );
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: "scores",
      id: "scores",
      header: t("table.scores"),
      enableColumnFilter: !omittedFilter.find((f) => f === "scores"),
      cell: ({ row }) => {
        const values: TracesTableRow["scores"] = row.getValue("scores");
        return <GroupedScoreBadges scores={values} variant="headings" />;
      },
      enableHiding: true,
    },
    {
      accessorKey: "input",
      header: t("table.input"),
      id: "input",
      cell: ({ row }) => {
        const traceId: TracesTableRow["id"] = row.getValue("id");
        return (
          <TracesDynamicCell
            traceId={traceId}
            col="input"
            singleLine={rowHeight === "s"}
          />
        );
      },
      enableHiding: true,
      defaultHidden: true,
    },
    {
      accessorKey: "output",
      header: t("table.output"),
      id: "output",
      cell: ({ row }) => {
        const traceId: TracesTableRow["id"] = row.getValue("id");
        return (
          <TracesDynamicCell
            traceId={traceId}
            col="output"
            singleLine={rowHeight === "s"}
          />
        );
      },
      enableHiding: true,
      defaultHidden: true,
    },
    {
      accessorKey: "metadata",
      header: t("table.metadata"),
      cell: ({ row }) => {
        const traceId: TracesTableRow["id"] = row.getValue("id");
        return (
          <TracesDynamicCell
            traceId={traceId}
            col="metadata"
            singleLine={rowHeight === "s"}
          />
        );
      },
      enableHiding: true,
      defaultHidden: true,
    },
    {
      accessorKey: "level",
      id: "level",
      header: t("table.level"),
      cell: ({ row }) => {
        const value: TracesTableRow["level"] = row.getValue("level");
        return (
          <span
            className={cn(
              "rounded-sm p-0.5 text-xs",
              LevelColors[value].bg,
              LevelColors[value].text,
            )}
          >
            {t(`ObservationLevel.${value}`)}
          </span>
        );
      },
      enableHiding: true,
      defaultHidden: true,
      enableSorting: true,
    },
    {
      accessorKey: "observationCount",
      id: "observationCount",
      header: t("table.observationCount"),
      enableHiding: true,
      defaultHidden: true,
    },
    {
      accessorKey: "version",
      id: "version",
      header: t("table.version"),
      enableHiding: true,
      enableSorting: true,
      defaultHidden: true,
    },
    {
      accessorKey: "release",
      id: "release",
      header: t("table.release"),
      enableHiding: true,
      enableSorting: true,
      defaultHidden: true,
    },
    {
      accessorKey: "tags",
      id: "tags",
      header: t("table.tags"),
      cell: ({ row }) => {
        const tags: TracesTableRow["tags"] = row.getValue("tags");
        const traceId: TracesTableRow["id"] = row.getValue("id");
        const filterOptionTags = traceFilterOptions.data?.tags ?? [];
        const allTags = filterOptionTags.map((t) => t.value);
        return (
          <TagTracePopover
            tags={tags}
            availableTags={allTags}
            projectId={projectId}
            traceId={traceId}
            tracesFilter={tracesAllQueryFilter}
          />
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "action",
      header: t("table.action"),
      cell: ({ row }) => {
        const traceId: TracesTableRow["id"] = row.getValue("id");
        return traceId && typeof traceId === "string" ? (
          <DeleteButton
            itemId={traceId}
            projectId={projectId}
            scope="traces:delete"
            invalidateFunc={() => void utils.traces.all.invalidate()}
            type="trace"
            isTableAction={true}
          />
        ) : undefined;
      },
    },
  ];

  const [columnVisibility, setColumnVisibility] =
    useColumnVisibility<TracesTableRow>("tracesColumnVisibility", columns);

  return (
    <>
      <DataTableToolbar
        columns={columns}
        filterColumnDefinition={transformFilterOptions(traceFilterOptions.data)}
        searchConfig={{
          placeholder: t("table.SearchTip"),
          updateQuery: setSearchQuery,
          currentQuery: searchQuery ?? undefined,
        }}
        filterState={userFilterState}
        setFilterState={setUserFilterState}
        actionButtons={
          Object.keys(selectedRows).filter((traceId) =>
            traces.data?.traces.map((t) => t.id).includes(traceId),
          ).length > 0 ? (
            <TraceTableMultiSelectAction
              // Exclude traces that are not in the current page
              selectedTraceIds={Object.keys(selectedRows).filter((traceId) =>
                traces.data?.traces.map((t) => t.id).includes(traceId),
              )}
              projectId={projectId}
              onDeleteSuccess={() => {
                setSelectedRows({});
              }}
            />
          ) : null
        }
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        rowHeight={rowHeight}
        setRowHeight={setRowHeight}
      />
      <DataTable
        columns={columns}
        data={
          traces.isLoading
            ? { isLoading: true, isError: false }
            : traces.isError
              ? {
                isLoading: false,
                isError: true,
                error: traces.error.message,
              }
              : {
                isLoading: false,
                isError: false,
                data: traces.data.traces.map((t) => convertToTableRow(t)),
              }
        }
        pagination={{
          pageCount: Math.ceil(Number(totalCount) / paginationState.pageSize),
          onChange: setPaginationState,
          state: paginationState,
        }}
        setOrderBy={setOrderByState}
        orderBy={orderByState}
        rowSelection={selectedRows}
        setRowSelection={setSelectedRows}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        rowHeight={rowHeight}
      />
    </>
  );
}

const TracesDynamicCell = ({
  traceId,
  col,
  singleLine = false,
}: {
  traceId: string;
  col: "input" | "output" | "metadata";
  singleLine?: boolean;
}) => {
  const trace = api.traces.byId.useQuery(
    { traceId: traceId },
    {
      enabled: typeof traceId === "string",
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      refetchOnMount: false, // prevents refetching loops
    },
  );
  return (
    <IOTableCell
      isLoading={trace.isLoading}
      data={
        col === "output"
          ? trace.data?.output
          : col === "input"
            ? trace.data?.input
            : trace.data?.metadata
      }
      className={cn(col === "output" && "bg-accent-light-green")}
      singleLine={singleLine}
    />
  );
};
