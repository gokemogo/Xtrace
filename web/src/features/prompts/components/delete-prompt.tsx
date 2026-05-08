import { Button } from "@/src/components/ui/button";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { api } from "@/src/utils/api";
import { Trash } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { useLanguage } from "@/src/contexts/LanguageContext";

export function DeletePrompt({ promptName }: { promptName: string }) {
  const { t } = useLanguage()
  const projectId = useProjectIdFromURL();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const hasAccess = useHasAccess({ projectId, scope: "prompts:CUD" });

  const mutDeletePrompt = api.prompts.delete.useMutation({
    onSuccess: () => {
      void utils.prompts.invalidate();
    },
  });

  return (
    <Popover open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" disabled={!hasAccess}>
          <Trash className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <h2 className="text-md mb-3 font-semibold">{t("buttons.Please confirm")}</h2>
        <p className="mb-3 text-sm">
          {t("prompts.This action permanently deletes this prompt All requests to fetch prompt")}{" "}
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {promptName}
          </code>{" "}
          {t("prompts.will error")}
        </p>
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="destructive"
            loading={mutDeletePrompt.isLoading}
            onClick={() => {
              if (!projectId) {
                console.error("Project ID is missing");
                return;
              }

              void mutDeletePrompt.mutateAsync({
                projectId,
                promptName,
              });
              setIsOpen(false);
            }}
          >
            {t("prompts.Delete Prompt")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
