import Header from "@/src/components/layouts/header";
import { useRouter } from "next/router";
import TracesTable from "@/src/components/table/use-cases/traces";
import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function Traces() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useLanguage();

  return (
    <FullScreenPage>
      <Header
        title={t("dashboard.tracesTitle")}
        help={{
          description: t("dashboard.tracesHelpDescription"),
          // href: "https://langfuse.com/docs/tracing",
        }}
      />
      <TracesTable projectId={projectId} />
    </FullScreenPage>
  );
}
