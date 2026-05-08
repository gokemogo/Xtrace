import Link from "next/link";

import { Label } from "@/src/components/ui/label";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { api } from "@/src/utils/api";
import { type UIModelParams } from "@langfuse/shared";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const LLMApiKeyComponent = (p: {
  projectId: string;
  modelParams: UIModelParams;
}) => {
  const { t } = useLanguage()
  const hasAccess = useHasAccess({
    projectId: p.projectId,
    scope: "llmApiKeys:read",
  });

  if (!hasAccess) {
    return (
      <div>
        <Label className="text-xs font-semibold">API key</Label>
        <p className="text-sm text-muted-foreground">
          {t("llmApiKeys.LLM API Key visible")}
        </p>
      </div>
    );
  }

  const apiKeys = api.llmApiKey.all.useQuery({
    projectId: p.projectId,
  });

  if (apiKeys.isLoading) {
    return (
      <div>
        <Label className="text-xs font-semibold">{t("llmApiKeys.API key")}</Label>
        <p className="text-sm text-muted-foreground">{t("common.loading")}...</p>
      </div>
    );
  }

  const modelProvider = p.modelParams.provider.value;
  const apiKey = apiKeys.data?.data.find((k) => k.provider === modelProvider);

  return (
    <div className="space-y-2 text-xs">
      <Label className="text-xs font-semibold">API key</Label>
      <div>
        {apiKey ? (
          <Link href={`/project/${p.projectId}/settings#llm-api-keys`}>
            <span className="mr-2 rounded-sm bg-input p-1 text-xs">
              {apiKey.displaySecretKey}
            </span>
          </Link>
        ) : undefined}
      </div>
      {/* Custom form message to include a link to the already existing prompt */}
      {!apiKey ? (
        <div className="flex flex-col font-medium text-destructive">
          {t("llmApiKeys.No LLM API key provider", { modelProvider })}

          <Link
            href={`/project/${p.projectId}/settings`}
            className="flex flex-row"
          >
            {t("llmApiKeys.Create a new LLM API key here")} <ArrowTopRightIcon />
          </Link>
        </div>
      ) : undefined}
      <p className="text-muted-foreground">
        {t("llmApiKeys.LLM API key incur costs")}
      </p>
    </div>
  );
};
