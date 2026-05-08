import { Divider } from "@tremor/react";

import { usePlaygroundContext } from "../context";
import { PromptVariableComponent } from "./PromptVariableComponent";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const Variables = () => {
  const { t } = useLanguage()
  const { promptVariables } = usePlaygroundContext();
  const renderNoVariables = () => (
    <div className="mt-4 text-xs">
      <p className="mb-2">{t("playground.No variables defined")}</p>
      <p>
        {t("playground.add variable")}
        &#123;&#123;exampleVariable&#125;&#125;
      </p>
    </div>
  );
  const renderVariables = () => (
    <div className="h-full overflow-auto pr-4">
      {promptVariables
        .sort((a, b) => {
          if (a.isUsed && !b.isUsed) return -1;
          if (!a.isUsed && b.isUsed) return 1;

          return a.name.localeCompare(b.name);
        })
        .map((promptVariable, index) => {
          return (
            <>
              <PromptVariableComponent
                promptVariable={promptVariable}
                key={promptVariable.name}
              />
              {index !== promptVariables.length - 1 ? (
                <Divider className="my-2 text-muted-foreground" />
              ) : null}
            </>
          );
        })}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <p className="font-semibold">{t("playground.Variables")}</p>
      {promptVariables.length === 0 ? renderNoVariables() : renderVariables()}
    </div>
  );
};
