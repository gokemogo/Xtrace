import { Switch } from "@/src/components/ui/switch";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { api } from "@/src/utils/api";
import { Link, LockIcon } from "lucide-react";
import { useState } from "react";
import copy from "copy-to-clipboard";

export const PublishTraceSwitch = (props: {
  traceId: string;
  projectId: string;
  isPublic: boolean;
}) => {
  const capture = usePostHogClientCapture();
  const hasAccess = useHasAccess({
    projectId: props.projectId,
    scope: "objects:publish",
  });
  const utils = api.useUtils();
  const mut = api.traces.publish.useMutation({
    onSuccess: () => utils.traces.invalidate(),
  });

  return (
    <Base
      id={props.traceId}
      isPublic={props.isPublic}
      onChange={(val) => {
        mut.mutate({
          projectId: props.projectId,
          traceId: props.traceId,
          public: val,
        });
        capture("trace_detail:publish_button_click");
      }}
      isLoading={mut.isLoading}
      disabled={!hasAccess}
    />
  );
};

export const PublishSessionSwitch = (props: {
  sessionId: string;
  projectId: string;
  isPublic: boolean;
}) => {
  const capture = usePostHogClientCapture();
  const hasAccess = useHasAccess({
    projectId: props.projectId,
    scope: "objects:publish",
  });
  const utils = api.useUtils();
  const mut = api.sessions.publish.useMutation({
    onSuccess: () => utils.sessions.invalidate(),
  });

  return (
    <Base
      id={props.sessionId}
      isPublic={props.isPublic}
      onChange={(val) => {
        mut.mutate({
          projectId: props.projectId,
          sessionId: props.sessionId,
          public: val,
        });
        capture("session_detail:publish_button_click");
      }}
      isLoading={mut.isLoading}
      disabled={!hasAccess}
    />
  );
};

const Base = (props: {
  id: string;
  onChange: (value: boolean) => void;
  isLoading: boolean;
  isPublic: boolean;
  disabled?: boolean;
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { t } = useLanguage()
  const copyUrl = () => {
    setIsCopied(true);
    copy(window.location.href);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm font-semibold">
        {props.isLoading ? (
          `${t("common.loading")}..`
        ) : props.isPublic ? (
          <div
            className="text-dark-green flex cursor-pointer items-center gap-1"
            onClick={() => copyUrl()}
          >
            {isCopied ? `${t("common.Link copied")}...` : t("common.Public")}
            <Link size={16} />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {t("common.Private")}
            <LockIcon size={16} />
          </div>
        )}
      </div>
      <Switch
        id="publish-trace"
        checked={props.isPublic}
        onCheckedChange={() => {
          if (props.isLoading) return;
          props.onChange(!props.isPublic);
        }}
        disabled={props.disabled}
      />
    </div>
  );
};
