import { Card } from "@/src/components/ui/card";
import { CodeView } from "@/src/components/ui/CodeJsonViewer";
import Header from "@/src/components/layouts/header";
import { useLanguage } from "@/src/contexts/LanguageContext";

export function HostNameProject() {
  const { t } = useLanguage()
  return (
    <div>
      <Header title={t("settings.Host Name")} level="h3" />
      <Card className="mb-4 p-4">
        <div className="mb-6">
          <div className="my-2">
            {t("settings.Host Connecting")}
          </div>
          <CodeView content={window.origin} />
        </div>
      </Card>
    </div>
  );
}
