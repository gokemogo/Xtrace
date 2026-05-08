import { Button } from "@/src/components/ui/button";
import { usePlaygroundContext } from "@/src/ee/features/playground/page/context";

import { GenerationOutput } from "./GenerationOutput";
import { ChatMessages } from "@/src/components/ChatMessages";
import { type MessagesContext } from "@/src/components/ChatMessages/types";
import { useLanguage } from "@/src/contexts/LanguageContext";

export const Messages: React.FC<MessagesContext> = (props) => {
  const { t } = useLanguage()
  return (
    <div className="flex h-full flex-col space-y-4 pr-4">
      <p className="font-semibold">{t("playground.Messages")}</p>
      <ChatMessages {...props} />
      <GenerationOutput />
      <SubmitButton />
    </div>
  );
};

const SubmitButton = () => {
  const { handleSubmit, isStreaming } = usePlaygroundContext();
  const { t } = useLanguage()

  return (
    <Button
      variant="default"
      className="h-[88px] w-full space-x-2 py-3"
      onClick={() => {
        handleSubmit().catch((err) => console.error(err));
      }}
      loading={isStreaming}
    >
      <p>{t("playground.Submit")} ({"\u2318"} + {t("playground.Enter")})</p>
    </Button>
  );
};
