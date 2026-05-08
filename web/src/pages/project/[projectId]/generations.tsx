import Header from "@/src/components/layouts/header";
import { useRouter } from "next/router";
import GenerationsTable from "@/src/components/table/use-cases/generations";
import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function Generations() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useLanguage();

  return (
    <FullScreenPage>
      <Header
        title={t("navigation.generations")}
        help={{
          description: t("generations.HelpDescription"),
          // href: "https://langfuse.com/docs/tracing",
        }}
      />
      <GenerationsTable projectId={projectId} />
    </FullScreenPage>
  );
}
