import { StringParam, useQueryParam } from "use-query-params";

import Header from "@/src/components/layouts/header";
import { NewPromptForm } from "@/src/features/prompts/components/NewPromptForm";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { api } from "@/src/utils/api";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const NewPrompt = () => {
  const projectId = useProjectIdFromURL();
  const [initialPromptId] = useQueryParam("promptId", StringParam);
  const { t } = useLanguage()

  const { data: initialPrompt, isInitialLoading } = api.prompts.byId.useQuery(
    {
      projectId: projectId as string, // Typecast as query is enabled only when projectId is present
      id: initialPromptId ?? "",
    },
    { enabled: Boolean(initialPromptId && projectId) },
  );

  if (isInitialLoading) {
    return <div>Loading...</div>;
  }

  const breadcrumb: { name: string; href?: string }[] = [
    {
      name: t("prompts.Prompts"),
      href: `/project/${projectId}/prompts/`,
    },
    {
      name: t("table.New prompt"),
    },
  ];

  if (initialPrompt) {
    breadcrumb.pop(); // Remove "New prompt"
    breadcrumb.push(
      {
        name: initialPrompt.name,
        href: `/project/${projectId}/prompts/${encodeURIComponent(initialPrompt.name)}`,
      },
      { name: t("prompts.New version") },
    );
  }

  return (
    <div className="xl:container">
      <Header
        title={
          initialPrompt
            ? `${initialPrompt.name} \u2014 ${t("prompts.New version")}`
            : t("prompts.Create New Prompt")
        }
        help={{
          description: t("prompts.promptsDescription"),
          href: "https://langfuse.com/docs/prompts",
        }}
        breadcrumb={breadcrumb}
      />
      {initialPrompt ? (
        <p className="text-sm text-muted-foreground">
          {t("prompts.Prompts are immutable")}
        </p>
      ) : null}
      <div className="my-8 max-w-screen-md">
        <NewPromptForm {...{ initialPrompt }} />
      </div>
    </div>
  );
};
