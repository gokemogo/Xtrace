import Header from "@/src/components/layouts/header";

import { useRouter } from "next/router";
import ModelTable from "@/src/components/table/use-cases/models";
import { Button } from "@/src/components/ui/button";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { Lock } from "lucide-react";
import Link from "next/link";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { FullScreenPage } from "@/src/components/layouts/full-screen-page";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function ModelsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const hasWriteAccess = useHasAccess({ projectId, scope: "models:CUD" });
  const capture = usePostHogClientCapture();
  const { t } = useLanguage();
  return (
    <FullScreenPage>
      <Header
        title={t("navigation.models")}
        help={{
          description: t("models.HelpDescription"),
          // href: "https://langfuse.com/docs/model-usage-and-cost",
        }}
        actionButtons={
          <Button
            variant="secondary"
            disabled={!hasWriteAccess}
            onClick={() => capture("models:new_form_open")}
            asChild
          >
            <Link
              href={hasWriteAccess ? `/project/${projectId}/models/new` : "#"}
            >
              {!hasWriteAccess && <Lock size={16} className="mr-2" />}
              {t("models.AddModel")}
            </Link>
          </Button>
        }
      />
      <ModelTable projectId={projectId} />
    </FullScreenPage>
  );
}
