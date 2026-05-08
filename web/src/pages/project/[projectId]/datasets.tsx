import Header from "@/src/components/layouts/header";
import { useRouter } from "next/router";
import { DatasetsTable } from "@/src/features/datasets/components/DatasetsTable";
import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function Traces() {
  const { t } = useLanguage()
  const router = useRouter();
  const projectId = router.query.projectId as string;

  return (
    <FullScreenPage>
      <Header
        title={t("navigation.datasets")}
        help={{
          description: t("datasets.datasets description"),
          // href: "https://langfuse.com/docs/datasets",
        }}
      />
      <DatasetsTable projectId={projectId} />
    </FullScreenPage>
  );
}
