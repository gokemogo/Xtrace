import Header from "@/src/components/layouts/header";
import { EvalConfigForm } from "@/src/ee/features/evals/components/eval-config-form";
import { api } from "@/src/utils/api";

import { useRouter } from "next/router";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function NewConfigsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  const evalTemplates = api.evals.allTemplates.useQuery({
    projectId,
    limit: 500,
    page: 0,
  });
  const { t } = useLanguage();

  return (
    <div>
      <Header
        title={t("evalConfigs.CreateTitle")}
        help={{
          description: t("evalConfigs.HelpDescription"),
          // href: "https://langfuse.com/docs/scores/model-based-evals",
        }}
      />
      <EvalConfigForm
        projectId={projectId}
        evalTemplates={evalTemplates.data?.templates ?? []}
      />
    </div>
  );
}
