import Header from "@/src/components/layouts/header";
import { EvalTemplateForm } from "@/src/ee/features/evals/components/template-form";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";

import { useRouter } from "next/router";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function NewTemplatesPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  const hasAccess = useHasAccess({ projectId, scope: "evalTemplate:read" });

  const { t } = useLanguage();

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="md:container">
      <Header
        title={t("evalTemplates.CreateTitle")}
        help={{
          description: t("evalTemplates.HelpDescription"),
          // href: "https://langfuse.com/docs/scores/model-based-evals",
        }}
      />
      <EvalTemplateForm projectId={projectId} isEditing={true} />
    </div>
  );
}
