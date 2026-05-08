import Header from "@/src/components/layouts/header";
import { useRouter } from "next/router";
import { Button } from "@/src/components/ui/button";
import Link from "next/link";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { Lock } from "lucide-react";
import EvalsTemplateTable from "@/src/ee/features/evals/components/eval-templates-table";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function TemplatesPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const capture = usePostHogClientCapture();
  const hasWriteAccess = useHasAccess({
    projectId,
    scope: "evalTemplate:create",
  });
  const { t } = useLanguage();

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden md:h-[calc(100vh-2rem)]">
      <Header
        title={t("evalTemplates.Title")}
        help={{
          description: t("evalTemplates.HelpDescription"),
          // href: "https://langfuse.com/docs/scores/model-based-evals",
        }}
        actionButtons={
          <Button
            disabled={!hasWriteAccess}
            onClick={() => capture("eval_templates:new_form_open")}
            asChild
          >
            <Link
              href={
                hasWriteAccess
                  ? `/project/${projectId}/evals/templates/new`
                  : "#"
              }
            >
              {!hasWriteAccess && <Lock size={16} className="mr-2" />}
              {t("evalTemplates.Add")}
            </Link>
          </Button>
        }
      />
      <EvalsTemplateTable projectId={projectId} />
    </div>
  );
}
