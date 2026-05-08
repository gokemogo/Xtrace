import Header from "@/src/components/layouts/header";

import { useRouter } from "next/router";
import ScoresTable from "@/src/components/table/use-cases/scores";
import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function ScoresPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useLanguage();

  return (
    <FullScreenPage>
      <Header
        title={t("navigation.scores")}
        help={{
          description: t("scores.HelpDescription"),
          // href: "https://langfuse.com/docs/scores",
        }}
      />
      <ScoresTable projectId={projectId} />
    </FullScreenPage>
  );
}
