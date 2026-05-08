import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { CodeView } from "@/src/components/ui/CodeJsonViewer";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { CreateApiKeyButton } from "@/src/features/public-api/components/CreateApiKeyButton";
import { useHasAccess } from "@/src/features/rbac/utils/checkAccess";
import { api } from "@/src/utils/api";
import { DialogDescription } from "@radix-ui/react-dialog";
import { TrashIcon } from "lucide-react";
import { useState } from "react";

export function ApiKeyList(props: { projectId: string }) {
  const { t } = useLanguage()
  const hasAccess = useHasAccess({
    projectId: props.projectId,
    scope: "apiKeys:read",
  });

  const apiKeys = api.apiKeys.byProjectId.useQuery(
    {
      projectId: props.projectId,
    },
    {
      enabled: hasAccess,
    },
  );

  if (!hasAccess) return null;

  return (
    <div>
      <Header title={t("settings.API keys")} level="h3" />
      <Card className="mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden text-primary md:table-cell">
                {t("common.Created")}
              </TableHead>
              {/* <TableHead className="text-primary">Note</TableHead> */}
              <TableHead className="text-primary">{t("common.Public Key")}</TableHead>
              <TableHead className="text-primary">{t("common.Secret Key")}</TableHead>
              {/* <TableHead className="text-primary">Last used</TableHead> */}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="text-muted-foreground">
            {apiKeys.data?.map((apiKey) => (
              <TableRow key={apiKey.id} className="hover:bg-primary-foreground">
                <TableCell className="hidden md:table-cell">
                  {apiKey.createdAt.toLocaleDateString()}
                </TableCell>
                {/* <TableCell>{apiKey.note ?? ""}</TableCell> */}
                <TableCell className="font-mono">
                  <CodeView
                    className="inline-block"
                    content={apiKey.publicKey}
                  />
                </TableCell>
                <TableCell className="font-mono">
                  {apiKey.displaySecretKey}
                </TableCell>
                {/* <TableCell>
                  {apiKey.lastUsedAt?.toLocaleDateString() ?? "Never"}
                </TableCell> */}
                <TableCell>
                  <DeleteApiKeyButton
                    projectId={props.projectId}
                    apiKeyId={apiKey.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <CreateApiKeyButton projectId={props.projectId} />
    </div>
  );
}

// show dialog to let user confirm that this is a destructive action
function DeleteApiKeyButton(props: { projectId: string; apiKeyId: string }) {
  const capture = usePostHogClientCapture();
  const hasAccess = useHasAccess({
    projectId: props.projectId,
    scope: "apiKeys:delete",
  });
  const { t } = useLanguage()
  const utils = api.useUtils();
  const mutDeleteApiKey = api.apiKeys.delete.useMutation({
    onSuccess: () => utils.apiKeys.invalidate(),
  });
  const [open, setOpen] = useState(false);

  if (!hasAccess) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <TrashIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-5">{t("apiKeys.Delete API key")}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t("apiKeys.DeleteConfirmation")}
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              mutDeleteApiKey
                .mutateAsync({
                  projectId: props.projectId,
                  id: props.apiKeyId,
                })
                .then(() => {
                  capture("project_settings:api_key_delete");
                  setOpen(false);
                })
                .catch((error) => {
                  console.error(error);
                });
            }}
            loading={mutDeleteApiKey.isLoading}
          >
            {t("buttons.Permanently delete")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("buttons.Cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
