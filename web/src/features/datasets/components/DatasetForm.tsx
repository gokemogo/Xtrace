import { Button } from "@/src/components/ui/button";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { api } from "@/src/utils/api";
import { useState } from "react";
import { Input } from "@/src/components/ui/input";
import { JsonEditor } from "@/src/components/json-editor";
import { type Prisma } from "@langfuse/shared";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useLanguage } from "@/src/contexts/LanguageContext";

interface BaseDatasetFormProps {
  mode: "create" | "update" | "delete";
  projectId: string;
  onFormSuccess?: () => void;
  className?: string;
}

interface CreateDatasetFormProps extends BaseDatasetFormProps {
  mode: "create";
}

interface DeleteDatasetFormProps extends BaseDatasetFormProps {
  mode: "delete";
  datasetId: string;
}

interface UpdateDatasetFormProps extends BaseDatasetFormProps {
  mode: "update";
  datasetId: string;
  datasetName: string;
  datasetDescription?: string;
  datasetMetadata?: Prisma.JsonValue;
}

type DatasetFormProps =
  | CreateDatasetFormProps
  | UpdateDatasetFormProps
  | DeleteDatasetFormProps;

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Input is required" })
    .refine((name) => name.trim().length > 0, {
      message: "Input should not be only whitespace",
    }),
  description: z.string(),
  metadata: z.string().refine(
    (value) => {
      if (value === "") return true;
      try {
        const parsed = JSON.parse(value);
        // only allow objects/arrays or JSON string literals
        if (parsed === null) return false;
        const t = typeof parsed;
        return t === "object" || t === "string";
      } catch (error) {
        return false;
      }
    },
    {
      message: "Please provide a JSON object",
    },
  ),
});

export const DatasetForm = (props: DatasetFormProps) => {
  const [formError, setFormError] = useState<string | null>(null);
  const capture = usePostHogClientCapture();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues:
      props.mode === "update"
        ? {
          name: props.datasetName,
          description: props.datasetDescription ?? "",
          metadata: props.datasetMetadata
            ? JSON.stringify(props.datasetMetadata, null, 2)
            : "",
        }
        : {
          name: "",
          description: "",
          metadata: "",
        },
  });
  const { t } = useLanguage()
  const utils = api.useUtils();
  const createMutation = api.datasets.createDataset.useMutation();
  const renameMutation = api.datasets.updateDataset.useMutation();
  const deleteMutation = api.datasets.deleteDataset.useMutation();

  function onSubmit(values: z.infer<typeof formSchema>) {
    const trimmedValues = {
      ...values,
      name: values.name.trim(),
      description: values.description !== "" ? values.description.trim() : null,
    };
    if (props.mode === "create") {
      capture("datasets:new_form_submit");
      createMutation
        .mutateAsync({
          ...trimmedValues,
          projectId: props.projectId,
        })
        .then(() => {
          void utils.datasets.invalidate();
          props.onFormSuccess?.();
          form.reset();
        })
        .catch((error: Error) => {
          setFormError(error.message);
          console.error(error);
        });
    } else if (props.mode === "update") {
      capture("datasets:update_form_submit");
      renameMutation
        .mutateAsync({
          ...trimmedValues,
          projectId: props.projectId,
          datasetId: props.datasetId,
        })
        .then(() => {
          void utils.datasets.invalidate();
          props.onFormSuccess?.();
          form.reset();
        })
        .catch((error: Error) => {
          setFormError(error.message);
          console.error(error);
        });
    }
  }

  const handleDelete = () => {
    if (props.mode !== "delete") return;
    capture("datasets:delete_form_submit");
    deleteMutation
      .mutateAsync({
        projectId: props.projectId,
        datasetId: props.datasetId,
      })
      .then(() => {
        void utils.datasets.invalidate();
        props.onFormSuccess?.();
        form.reset();
      })
      .catch((error: Error) => {
        setFormError(error.message);
        console.error(error);
      });
  };

  return (
    <div>
      <Form {...form}>
        <form
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={
            props.mode === "delete" ? handleDelete : form.handleSubmit(onSubmit)
          }
        >
          {props.mode !== "delete" && (
            <div className="mb-8 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.Name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("datasets.Description (optional)")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("datasets.Metadata (optional)")}</FormLabel>
                    <FormControl>
                      <JsonEditor
                        defaultValue={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <Button
            type="submit"
            variant={props.mode === "delete" ? "destructive" : "default"}
            loading={props.mode === "create" && createMutation.isLoading}
            className="w-full"
          >
            {props.mode === "create"
              ? t("datasets.Create dataset")
              : props.mode === "delete"
                ? t("datasets.Delete dataset")
                : t("datasets.Update dataset")}
          </Button>
        </form>
      </Form>
      {formError && (
        <p className="text-red text-center">
          <span className="font-bold">{t("errors.Error")}:</span> {formError}
        </p>
      )}
    </div>
  );
};
