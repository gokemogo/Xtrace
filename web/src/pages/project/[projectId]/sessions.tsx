import Header from "@/src/components/layouts/header";
import { useRouter } from "next/router";
import SessionsTable from "@/src/components/table/use-cases/sessions";
import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function Sessions() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useLanguage();

  return (
    <FullScreenPage>
      <Header
        title={t("navigation.sessions")}
        help={{
          description: t("sessions.HelpDescription"),
          // href: "https://langfuse.com/docs/sessions",
        }}
      />

      <SessionsTable projectId={projectId} />
    </FullScreenPage>
  );
}
