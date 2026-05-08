import Header from "@/src/components/layouts/header";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { PromptTable } from "@/src/features/prompts/components/prompts-table";

export default function Prompts() {
  const { t } = useLanguage()
  return (
    <div>
      <Header
        title={t("navigation.prompts")}
        help={{
          description: t("prompts.Description"),
          // href: "https://langfuse.com/docs/prompts",
        }}
      />
      <PromptTable />
    </div>
  );
}
