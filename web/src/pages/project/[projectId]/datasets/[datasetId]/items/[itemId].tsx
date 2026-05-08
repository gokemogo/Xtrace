import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { DatasetRunItemsTable } from "@/src/features/datasets/components/DatasetRunItemsTable";
import { EditDatasetItem } from "@/src/features/datasets/components/EditDatasetItem";
import { DetailPageNav } from "@/src/features/navigate-detail-pages/DetailPageNav";
import { api } from "@/src/utils/api";
import { ListTree } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Dataset() {
  const { t } = useLanguage()
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const datasetId = router.query.datasetId as string;
  const itemId = router.query.itemId as string;

  const dataset = api.datasets.byId.useQuery({
    datasetId,
    projectId,
  });
  const item = api.datasets.itemById.useQuery(
    {
      datasetId,
      projectId,
      datasetItemId: itemId,
    },
    {
      refetchOnWindowFocus: false, // breaks dirty form state
    },
  );

  return (
    <FullScreenPage>
      <Header
        title={t("datasets.Dataset Item")}
        breadcrumb={[
          { name: t("navigation.datasets"), href: `/project/${projectId}/datasets` },
          {
            name: dataset.data?.name ?? datasetId,
            href: `/project/${projectId}/datasets/${datasetId}`,
          },
          {
            name: t("datasets.Items"),
            href: `/project/${projectId}/datasets/${datasetId}/items`,
          },
          { name: itemId },
        ]}
        actionButtons={
          <>
            {item.data?.sourceTraceId && (
              <Button variant="outline" asChild>
                <Link
                  href={`/project/${projectId}/traces/${item.data.sourceTraceId}`}
                  title={t("datasets.View source", { type: item.data.sourceObservationId ? "observation" : "trace" })}
                >
                  <ListTree className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <DetailPageNav
              currentId={itemId}
              path={(id) =>
                `/project/${projectId}/datasets/${datasetId}/items/${id}`
              }
              listKey="datasetItems"
            />
          </>
        }
      />
      <EditDatasetItem projectId={projectId} datasetItem={item.data ?? null} />
      <Header title={t("datasets.Runs")} level="h3" />
      <DatasetRunItemsTable
        projectId={projectId}
        datasetItemId={itemId}
        datasetId={datasetId}
      />
    </FullScreenPage>
  );
}
