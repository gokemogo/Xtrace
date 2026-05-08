import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { Switch } from "@/src/components/ui/switch";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { env } from "@/src/env.mjs";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { posthogIntegrationFormSchema } from "@/src/features/posthog-integration/types";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { api } from "@/src/utils/api";
import { type RouterOutput } from "@/src/utils/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@tremor/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

export default function PosthogIntegrationSettings() {
  const router = useRouter();
  const { t } = useLanguage()
  const projectId = router.query.projectId as string;
  const hasAccess = useHasAccess({ projectId, scope: "integrations:CRUD" });
  const state = api.posthogIntegration.get.useQuery(
    { projectId },
    {
      enabled: hasAccess,
    },
  );
  if (env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION === undefined) return null;

  return (
    <div className="md:container">
      <Header
        title={t("settings.PostHog Integration")}
        breadcrumb={[
          { name: "Settings", href: `/project/${projectId}/settings` },
        ]}
        actionButtons={
          <Button asChild variant="secondary">
            <Link href="https://langfuse.com/docs/analytics/posthog">
              {t("settings.IntegrationDocs")}
            </Link>
          </Button>
        }
        status={
          state.isInitialLoading || !hasAccess
            ? undefined
            : state.data?.enabled
              ? t("settings.active")
              : t("settings.inactive")
        }
      />
      <p className="mb-4 text-sm text-primary">
        {t("settings.posthog.We have teamed up with")}{" "}
        <Link href="https://posthog.com" className="underline">
          PostHog
        </Link>{" "}
        {t("settings.posthog.OSS product analytics")}
      </p>
      {!hasAccess && (
        <p className="text-sm">
          {t("settings.posthog.not grant you access")}
        </p>
      )}
      {hasAccess && (
        <>
          <Header level="h3" title={t("settings.posthog.Configuration")} />
          <Card className="p-4">
            <PostHogIntegrationSettings
              state={state.data}
              projectId={projectId}
              isLoading={state.isLoading}
            />
          </Card>
        </>
      )}
      {state.data?.enabled && (
        <>
          <Header level="h3" title="Status" className="mt-8" />
          <p className="text-sm text-primary">
            Data synced until:{" "}
            {state.data?.lastSyncAt
              ? new Date(state.data.lastSyncAt).toLocaleString()
              : "Never (pending)"}
          </p>
          <p className="mt-2 text-sm text-primary">
            While in Beta, the sync is scheduled to run once a day.
          </p>
        </>
      )}
    </div>
  );
}

const PostHogIntegrationSettings = ({
  state,
  projectId,
  isLoading,
}: {
  state?: RouterOutput["posthogIntegration"]["get"];
  projectId: string;
  isLoading: boolean;
}) => {
  const { t } = useLanguage()
  const capture = usePostHogClientCapture();
  const posthogForm = useForm<z.infer<typeof posthogIntegrationFormSchema>>({
    resolver: zodResolver(posthogIntegrationFormSchema),
    defaultValues: {
      posthogHostname: state?.posthogHostName ?? "",
      posthogProjectApiKey: state?.posthogApiKey ?? "",
      enabled: state?.enabled ?? false,
    },
    disabled: isLoading,
  });

  useEffect(() => {
    posthogForm.reset({
      posthogHostname: state?.posthogHostName ?? "",
      posthogProjectApiKey: state?.posthogApiKey ?? "",
      enabled: state?.enabled ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const utils = api.useUtils();
  const mut = api.posthogIntegration.update.useMutation({
    onSuccess: () => {
      utils.posthogIntegration.invalidate();
    },
  });
  const mutDelete = api.posthogIntegration.delete.useMutation({
    onSuccess: () => {
      utils.posthogIntegration.invalidate();
    },
  });

  async function onSubmit(
    values: z.infer<typeof posthogIntegrationFormSchema>,
  ) {
    capture("integrations:posthog_form_submitted");
    mut.mutate({
      projectId,
      ...values,
    });
    console.log(values);
  }

  return (
    <Form {...posthogForm}>
      <form
        className="space-y-3"
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={posthogForm.handleSubmit(onSubmit)}
      >
        <FormField
          control={posthogForm.control}
          name="posthogHostname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settings.posthog.Posthog Hostname")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {t("settings.posthog.region")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={posthogForm.control}
          name="posthogProjectApiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settings.posthog.Posthog Project API Key")}</FormLabel>
              <FormControl>
                <PasswordInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={posthogForm.control}
          name="enabled"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("common.Enabled")}</FormLabel>
              <FormControl>
                <Switch
                  id="posthog-integration-enabled"
                  checked={field.value}
                  onCheckedChange={() => {
                    field.onChange(!field.value);
                  }}
                  className="ml-4 mt-1"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
      <div className="mt-8 flex gap-2">
        <Button
          loading={mut.isLoading}
          onClick={posthogForm.handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {t("common.save")}
        </Button>
        <Button
          variant="ghost"
          loading={mutDelete.isLoading}
          disabled={isLoading || !!!state}
          onClick={() => {
            if (
              confirm(
                t("settings.posthog.reset the PostHog"),
              )
            )
              mutDelete.mutate({ projectId });
          }}
        >
          {t("buttons.Reset")}
        </Button>
      </div>
    </Form>
  );
};
