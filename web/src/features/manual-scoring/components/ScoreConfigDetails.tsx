import { useLanguage } from "@/src/contexts/LanguageContext";
import { isNumericDataType } from "@/src/features/manual-scoring/lib/helpers";
import { type ValidatedScoreConfig } from "@/src/features/public-api/types/score-configs";
import { isPresent } from "@/src/utils/typeChecks";
import React from "react";

export function ScoreConfigDetails({
  config,
}: {
  config: ValidatedScoreConfig;
}) {
  const { t } = useLanguage()
  const { name, description, minValue, maxValue, dataType } = config;
  if (!description && !isPresent(minValue) && !isPresent(maxValue)) return null;
  const isNameTruncated = name.length > 20;

  return (
    <div className="text-wrap bg-background p-2 text-xs font-light">
      {!!description && <p>{`${t("common.Description")}: ${description}`}</p>}
      {isNumericDataType(dataType) &&
        (isPresent(minValue) || isPresent(maxValue)) ? (
        <p>{`${t("common.Range")}: [${minValue ?? "-∞"}, ${maxValue ?? "∞"}]`}</p>
      ) : null}
      {isNameTruncated && <p>{`${t("common.Full name")}: ${name}`}</p>}
    </div>
  );
}
