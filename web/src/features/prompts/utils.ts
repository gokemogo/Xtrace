import {
  LATEST_PROMPT_LABEL,
  LATEST_PROMPT_LABEL_CN,
  PRODUCTION_LABEL,
  PRODUCTION_LABEL_CN,
} from "@/src/features/prompts/constants";

export const isReservedPromptLabel = (label: string) => {
  return [
    PRODUCTION_LABEL,
    LATEST_PROMPT_LABEL,
    LATEST_PROMPT_LABEL_CN,
    PRODUCTION_LABEL_CN,
  ].includes(label);
};
