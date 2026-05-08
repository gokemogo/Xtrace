import React from "react";
import Header from "@/src/components/layouts/header";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { CreateScoreConfigButton } from "@/src/features/manual-scoring/components/CreateScoreConfigButton";
import { ScoreConfigsTable } from "@/src/components/table/use-cases/score-configs";
import { useLanguage } from "@/src/contexts/LanguageContext";

export function ScoreConfigSettings({ projectId }: { projectId: string }) {
  const { t } = useLanguage()
  const hasReadAccess = useHasAccess({
    projectId: projectId,
    scope: "scoreConfigs:read",
  });

  if (!hasReadAccess) return null;

  return (
    <div id="score-configs">
      <Header title={t("settings.Score Configs")} level="h3" />
      <p className="mb-4 text-sm">
        {t("scoreconfigs.PreLink")}
        {/* <a
          href="https://langfuse.com/docs/scores/manually"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("scoreconfigs.LinkText")}
        </a> */}
        {t("scoreconfigs.PostLink")}
      </p>
      <ScoreConfigsTable projectId={projectId} />
      <CreateScoreConfigButton projectId={projectId} />
    </div>
  );
}
