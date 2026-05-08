import Header from "@/src/components/layouts/header";
import { useLanguage } from "@/src/contexts/LanguageContext";

import { useRouter } from "next/router";
import { NewModelForm } from "@/src/features/models/components/NewModelForm";

export default function ModelsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useLanguage();

  return (
    <div className="mb-12 md:container">
      <Header
        title={t("models.NewModelDefinition")}
        breadcrumb={[
          {
            name: t("navigation.models"),
            href: `/project/${projectId}/models`,
          },
          {
            name: t("models.New"),
          },
        ]}
        help={{
          description: t("models.NewHelpDescription"),
          // href: "https://langfuse.com/docs/model-usage-and-cost",
        }}
      />
      <NewModelForm
        projectId={projectId}
        onFormSuccess={() => void router.push(`/project/${projectId}/models`)}
      />
    </div>
  );
}
