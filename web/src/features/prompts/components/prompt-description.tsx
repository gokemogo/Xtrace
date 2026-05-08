import { Badge } from "@/src/components/ui/badge";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const PromptDescription = ({
  currentExtractedVariables,
}: {
  currentExtractedVariables: string[];
}) => {
  const { t } = useLanguage();

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {t("prompts.variableUsage")} <code className="text-xs">{"{{variable}}"}</code> {t("prompts.variableInsert")}
        <b className="font-semibold"> {t("prompts.variableNoteTitle")}</b> {t("prompts.variableNote")}
        {currentExtractedVariables.length > 0 ? ` ${t("prompts.availableVariablesPrefix")}` : ""}
      </p>
      <div className="flex min-h-6 flex-wrap gap-2">
        {currentExtractedVariables.map((variable) => (
          <Badge key={variable} variant="outline">
            {variable}
          </Badge>
        ))}
      </div>
    </>
  );
};
