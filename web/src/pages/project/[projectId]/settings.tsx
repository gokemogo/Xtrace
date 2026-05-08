import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { SiOpenai } from "react-icons/si";
import Header from "@/src/components/layouts/header";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { ApiKeyList } from "@/src/features/public-api/components/ApiKeyList";
import { useRouter } from "next/router";
import { Code, Bird, GraduationCap } from "lucide-react";
import { ProjectMembersTable } from "@/src/features/rbac/components/ProjectMembersTable";
import { DeleteProjectButton } from "@/src/features/projects/components/DeleteProjectButton";
import { HostNameProject } from "@/src/features/projects/components/HostNameProject";
import { ProjectUsageChart } from "@/src/features/usage-metering/ProjectUsageChart";
import { TransferOwnershipButton } from "@/src/features/projects/components/TransferOwnershipButton";
import RenameProject from "@/src/features/projects/components/RenameProject";
import { env } from "@/src/env.mjs";
import { Card } from "@tremor/react";
import { Button } from "@/src/components/ui/button";
import Link from "next/link";
import { LlmApiKeyList } from "@/src/features/public-api/components/LLMApiKeyList";
import { ScoreConfigSettings } from "@/src/features/manual-scoring/components/ScoreConfigSettings";

export default function SettingsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useLanguage();

  return (
    <div className="md:container">
      <Header title={t("navigation.settings")} />
      <div className="flex flex-col gap-10">
        <HostNameProject />
        <ApiKeyList projectId={projectId} />
        <LlmApiKeyList projectId={projectId} />
        <ProjectMembersTable projectId={projectId} />
        {/* <ProjectUsageChart projectId={projectId} /> */}
        <ScoreConfigSettings projectId={projectId} />
        {/* <Integrations projectId={projectId} /> */}
        {/* <Instructions /> */}
        <RenameProject projectId={projectId} />
        <div className="space-y-3">
          <DeleteProjectButton projectId={projectId} />
          <TransferOwnershipButton projectId={projectId} />
        </div>
      </div>
    </div>
  );
}

const instructionItems = [
  { name: "Introduction", href: "https://langfuse.com/docs", icon: GraduationCap },
  { name: "Quickstart", href: "https://langfuse.com/docs/get-started", icon: RocketLaunchIcon },
  { name: "OpenAI", href: "https://langfuse.com/docs/integrations/openai", icon: SiOpenai },
  { name: "Langchain", href: "https://langfuse.com/docs/integrations/langchain", icon: Bird },
  { name: "LlamaIndex", href: "https://langfuse.com/docs/integrations/llama-index", icon: Code },
  { name: "Typescript", href: "https://langfuse.com/docs/sdk/typescript", icon: Code },
  { name: "Python", href: "https://langfuse.com/docs/sdk/python", icon: Code },
  { name: "API Reference", href: "https://langfuse.com/docs/reference", icon: Code },
];

function Instructions() {
  const { t } = useLanguage();

  return (
    <div>
      <Header title={t("settings.Docs")} level="h3" />
      <ul
        role="list"
        className="mt-6 divide-y divide-border border-b border-t border-border"
      >
        {instructionItems.map((item, itemIdx) => (
          <li key={itemIdx}>
            <div className="group relative flex items-start space-x-3 py-4">
              <div className="flex-shrink-0">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:border-primary-accent group-hover:text-primary-accent">
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-primary">
                  <a href={item.href} target="_blank" rel="noreferrer noopener">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {t(`settings.Instruction.${item.name}.title`, { defaultValue: item.name })}
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(`settings.Instruction.${item.name}.description`)}
                </p>
              </div>
              <div className="flex-shrink-0 self-center">
                <ChevronRightIcon
                  className="h-5 w-5 text-muted-foreground group-hover:text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Integrations = (props: { projectId: string }) => {
  const { t } = useLanguage();
  if (env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION === undefined) return null;

  return (
    <div>
      <Header title={t("settings.Integrations")} level="h3" />
      <Card className="p-4 lg:w-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/posthog-logo.svg"
          alt="Posthog Logo"
          className="mb-4 w-32"
        />
        <p className="mb-4 text-sm text-primary">{t("settings.posthog.description")}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" asChild>
            <Link
              href={`/project/${props.projectId}/settings/posthog-integration`}
            >
              {t("settings.Configure")}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="https://langfuse.com/docs/analytics/posthog">
              {t("settings.IntegrationDocs")}
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};
