import { useRouter } from "next/router";
import Header from "@/src/components/layouts/header";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { api } from "@/src/utils/api";
import TracesTable from "@/src/components/table/use-cases/traces";
import ScoresTable from "@/src/components/table/use-cases/scores";
import { compactNumberFormatter, usdFormatter } from "@/src/utils/numbers";
import { GroupedScoreBadges } from "@/src/components/grouped-score-badge";
import TableLink from "@/src/components/table/table-link";
import { StringParam, useQueryParam, withDefault } from "use-query-params";
import { DetailPageNav } from "@/src/features/navigate-detail-pages/DetailPageNav";
import SessionsTable from "@/src/components/table/use-cases/sessions";

const tabs = [
  "userDetail.tabs.Details",
  "userDetail.tabs.Sessions",
  "userDetail.tabs.Traces",
  "userDetail.tabs.Scores",
] as const;

export default function UserPage() {
  const router = useRouter();
  const userId = decodeURIComponent(router.query.userId as string);
  const projectId = router.query.projectId as string;

  const { t } = useLanguage();

  const [currentTab, setCurrentTab] = useQueryParam(
    "tab",
    withDefault(StringParam, tabs[0]),
  );

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
  }

  const renderTabContent = () => {
    switch (currentTab as (typeof tabs)[number]) {
      case "userDetail.tabs.Details":
        return <DetailsTab userId={userId} projectId={projectId} />;
      case "userDetail.tabs.Sessions":
        return <SessionsTab userId={userId} projectId={projectId} />;
      case "userDetail.tabs.Traces":
        return <TracesTab userId={userId} projectId={projectId} />;
      case "userDetail.tabs.Scores":
        return <ScoresTab userId={userId} projectId={projectId} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header
        title={t("userDetail.Title")}
        breadcrumb={[
          { name: t("navigation.users"), href: `/project/${projectId}/users` },
          { name: userId },
        ]}
        actionButtons={
          <DetailPageNav
            currentId={encodeURIComponent(userId)}
            path={(id) =>
              `/project/${projectId}/users/${encodeURIComponent(id)}`
            }
            listKey="users"
          />
        }
      />

      <div>
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">
            {t("tabs.select")}
          </label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-border py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
            defaultValue={currentTab}
            onChange={(e) => setCurrentTab(e.currentTarget.value)}
          >
            {tabs.map((tab) => (
              <option key={tab}>{t(tab)}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={classNames(
                    tab === currentTab
                      ? "border-primary-accent text-primary-accent"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-primary",
                    "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium",
                  )}
                  aria-current={tab === currentTab ? "page" : undefined}
                  onClick={() => setCurrentTab(tab)}
                >
                  {t(tab)}
                </button>
              ))}
            </nav>
          </div>
        </div>
        {renderTabContent()}
      </div>
    </div>
  );
}

type TabProps = {
  userId: string;
  projectId: string;
};

function DetailsTab({ userId, projectId }: TabProps) {
  const { t } = useLanguage();
  const user = api.users.byId.useQuery({ projectId: projectId, userId });

  const userData: { value: string; label: string }[] = user.data
    ? [
      { label: t("userDetail.labels.userId"), value: user.data.userId },
      {
        label: t("userDetail.labels.firstObservation"),
        value: user.data.firstObservation?.toLocaleString(),
      },
      {
        label: t("userDetail.labels.lastObservation"),
        value: user.data.lastObservation?.toLocaleString(),
      },
      {
        label: t("userDetail.labels.totalObservations"),
        value: compactNumberFormatter(user.data.totalObservations),
      },
      {
        label: t("userDetail.labels.totalTraces"),
        value: compactNumberFormatter(user.data.totalTraces),
      },
      {
        label: t("userDetail.labels.promptTokens"),
        value: compactNumberFormatter(user.data.totalPromptTokens),
      },
      {
        label: t("userDetail.labels.completionTokens"),
        value: compactNumberFormatter(user.data.totalCompletionTokens),
      },
      {
        label: t("userDetail.labels.totalTokens"),
        value: compactNumberFormatter(user.data.totalTokens),
      },
      {
        label: t("userDetail.labels.totalCost"),
        value: usdFormatter(user.data.sumCalculatedTotalCost, 2, 2),
      },
    ]
    : [];

  return (
    <div className="mt-5 pt-5">
      <div className="mt-6 border-t border-muted">
        <dl className="divide-y divide-muted">
          {userData.map((item) => (
            <div
              key={item.label}
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
            >
              <dt className="text-sm font-medium leading-6 text-primary">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-primary sm:col-span-2 sm:mt-0">
                {item.value ?? "-"}
              </dd>
            </div>
          ))}
          {user.data?.lastScore ? (
            <div
              key="score"
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
            >
              <dt className="text-sm font-medium leading-6 text-primary">
                {t("table.Last Score")}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-primary sm:col-span-2 sm:mt-0">
                <div className="flex items-center gap-4">
                  <TableLink
                    path={
                      user.data.lastScore.observationId
                        ? `/project/${projectId}/traces/${user.data.lastScore.traceId}?observation=${user.data.lastScore.observationId}`
                        : `/project/${projectId}/traces/${user.data.lastScore.traceId}`
                    }
                    value={user.data.lastScore.traceId}
                    truncateAt={40}
                  />
                  <GroupedScoreBadges scores={[user.data.lastScore]} />
                </div>
              </dd>
            </div>
          ) : undefined}
        </dl>
      </div>
    </div>
  );
}

function ScoresTab({ userId, projectId }: TabProps) {
  return (
    <div className="mt-5 pt-5">
      <ScoresTable
        projectId={projectId}
        userId={userId}
        omittedFilter={["User ID"]}
      />
    </div>
  );
}

function TracesTab({ userId, projectId }: TabProps) {
  return (
    <div className="mt-5 pt-5">
      <TracesTable
        projectId={projectId}
        userId={userId}
        omittedFilter={["User ID"]}
      />
    </div>
  );
}

function SessionsTab({ userId, projectId }: TabProps) {
  return (
    <div className="mt-5 pt-5">
      <SessionsTable
        projectId={projectId}
        userId={userId}
        omittedFilter={["User IDs"]}
      />
    </div>
  );
}
