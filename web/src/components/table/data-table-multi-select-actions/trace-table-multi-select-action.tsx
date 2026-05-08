import { ChevronDown, Trash } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/src/components/ui/dropdown-menu";
import { Button } from "@/src/components/ui/button";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { api } from "@/src/utils/api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { useState } from "react";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useLanguage } from "@/src/contexts/LanguageContext";

export function TraceTableMultiSelectAction({
  selectedTraceIds,
  projectId,
  onDeleteSuccess,
}: {
  selectedTraceIds: string[];
  projectId: string;
  onDeleteSuccess: () => void;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const capture = usePostHogClientCapture();
  const { t } = useLanguage()

  const hasDeleteAccess = useHasAccess({ projectId, scope: "traces:delete" });
  const mutDeleteTraces = api.traces.deleteMany.useMutation({
    onSuccess: () => {
      onDeleteSuccess();
      void utils.traces.all.invalidate();
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={selectedTraceIds.length < 1}>
            {t("table.Actions selected", { num: selectedTraceIds.length })}
            <ChevronDown className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            disabled={!hasDeleteAccess}
            onClick={() => {
              capture("trace:delete_form_open", {
                count: selectedTraceIds.length,
                source: "table-multi-select",
              });
              setOpen(true);
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>{t("common.delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("traces.Delete traces")}</DialogTitle>
            <DialogDescription>
              {t("traces.cannot be undone traces")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="destructive"
              loading={mutDeleteTraces.isLoading}
              disabled={mutDeleteTraces.isLoading}
              onClick={() => {
                void mutDeleteTraces
                  .mutateAsync({
                    traceIds: selectedTraceIds,
                    projectId,
                  })
                  .then(() => {
                    setOpen(false);
                  });
                capture("trace:delete_form_submit", {
                  count: selectedTraceIds.length,
                  source: "table-multi-select",
                });
              }}
            >
              {t("traces.Delete num trace", { num: selectedTraceIds.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
