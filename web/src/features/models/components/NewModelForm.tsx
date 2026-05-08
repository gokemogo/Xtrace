import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { DatePicker } from "@/src/components/date-picker";
import Header from "@/src/components/layouts/header";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { ModelUsageUnit } from "@langfuse/shared";
import { AutoComplete } from "@/src/features/prompts/components/auto-complete";
import { api } from "@/src/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { JsonEditor } from "@/src/components/json-editor";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import Link from "next/link";
import { utcDate } from "@/src/utils/dates";

const formSchema = z.object({
  modelName: z.string().min(1),
  matchPattern: z.string(),
  startDate: z.date().optional(),
  inputPrice: z
    .string()
    .refine((value) => value === "" || isFinite(parseFloat(value)), {
      message: "Price needs to be numeric",
    })
    .optional(),
  outputPrice: z
    .string()
    .refine((value) => value === "" || isFinite(parseFloat(value)), {
      message: "Price needs to be numeric",
    })
    .optional(),
  totalPrice: z
    .string()
    .refine((value) => value === "" || isFinite(parseFloat(value)), {
      message: "Price needs to be numeric",
    })
    .optional(),
  unit: z.nativeEnum(ModelUsageUnit),
  tokenizerId: z.enum(["openai", "claude", "None"]),
  tokenizerConfig: z.string().refine(
    (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        return false;
      }
    },
    {
      message: "Tokenizer config needs to be valid JSON",
    },
  ),
});

export const NewModelForm = (props: {
  projectId: string;
  onFormSuccess?: () => void;
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const capture = usePostHogClientCapture();
  const { t } = useLanguage();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelName: "",
      matchPattern: "",
      startDate: undefined,
      inputPrice: "",
      outputPrice: "",
      totalPrice: "",
      unit: ModelUsageUnit.Tokens,
      tokenizerId: "None",
      tokenizerConfig: "{}",
    },
  });

  const utils = api.useUtils();
  const createModelMutation = api.models.create.useMutation({
    onSuccess: () => utils.models.invalidate(),
    onError: (error) => setFormError(error.message),
  });

  const modelNames = api.models.modelNames.useQuery({
    projectId: props.projectId,
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    capture("models:new_form_submit");
    createModelMutation
      .mutateAsync({
        projectId: props.projectId,
        modelName: values.modelName,
        matchPattern: values.matchPattern,
        inputPrice: !!values.inputPrice
          ? parseFloat(values.inputPrice)
          : undefined,
        outputPrice: !!values.outputPrice
          ? parseFloat(values.outputPrice)
          : undefined,
        totalPrice: !!values.totalPrice
          ? parseFloat(values.totalPrice)
          : undefined,
        unit: values.unit,
        tokenizerId:
          values.tokenizerId === "None" ? undefined : values.tokenizerId,
        tokenizerConfig:
          values.tokenizerConfig &&
            typeof JSON.parse(values.tokenizerConfig) === "object"
            ? (JSON.parse(values.tokenizerConfig) as Record<string, number>)
            : undefined,
        startDate: values.startDate ? utcDate(values.startDate) : undefined,
      })
      .then(() => {
        props.onFormSuccess?.();
        form.reset();
      })
      .catch((error) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if ("message" in error && typeof error.message === "string") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          setFormError(error.message as string);
          return;
        } else {
          setFormError(JSON.stringify(error));
          console.error(error);
        }
      });
  }

  return (
    <Form {...form}>
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Header level="h3" title={t("models.form.nameHeader")} />
        <FormField
          control={form.control}
          name="modelName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.form.modelNameLabel")}</FormLabel>
              <FormControl>
                <AutoComplete
                  {...field}
                  options={
                    modelNames.data?.map((model) => ({
                      value: model,
                      label: model,
                    })) ?? []
                  }
                  placeholder=""
                  onValueChange={(option) => {
                    field.onChange(option.value)
                    form.setValue("matchPattern", `(?i)^(${option.value})$`)
                  }}
                  value={{ value: field.value, label: field.value }}
                  disabled={false}
                  createLabel={t("models.form.createModelName")}
                />
              </FormControl>
              <FormDescription>
                {t("models.form.modelNameDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Header level="h3" title={t("models.form.scopeHeader")} />
        <FormField
          control={form.control}
          name="matchPattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.form.matchPatternLabel")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {t("models.form.matchPatternDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.form.startDateLabel")}</FormLabel>
              <FormControl>
                <DatePicker
                  date={field.value}
                  onChange={(date) => field.onChange(date)}
                  clearable
                />
              </FormControl>
              <FormDescription>
                {t("models.form.startDateDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Header level="h3" title={t("models.form.pricingHeader")} />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.form.unitLabel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(ModelUsageUnit).map((unit) => (
                    <SelectItem value={unit} key={unit}>
                      {t(`models.Unit.${unit}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t("models.form.unitDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-2">
          <FormField
            control={form.control}
            name="inputPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("models.form.inputPriceLabel", {
                    unit: t(`models.Unit.${form.getValues("unit")}`),
                  })}
                </FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                {field.value !== null && field.value !== "" ? (
                  <FormDescription>
                    <ul className="font-mono text-xs">
                      <li>
                        {(parseFloat(field.value ?? "0") * 1000).toFixed(8)} USD
                        / 1k {form.getValues("unit").toLowerCase()}
                      </li>
                      <li>
                        {(parseFloat(field.value ?? "0") * 100_000).toFixed(8)}{" "}
                        USD / 100k {form.getValues("unit").toLowerCase()}
                      </li>
                      <li>
                        {(parseFloat(field.value ?? "0") * 1_000_000).toFixed(
                          8,
                        )}{" "}
                        USD / 1M {form.getValues("unit").toLowerCase()}
                      </li>
                    </ul>
                  </FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="outputPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("models.form.outputPriceLabel", {
                    unit: t(`models.Unit.${form.getValues("unit")}`),
                  })}
                </FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                {field.value !== null && field.value !== "" ? (
                  <FormDescription>
                    <ul className="font-mono text-xs">
                      <li>
                        {(parseFloat(field.value ?? "0") * 1000).toFixed(8)} USD
                        / 1k {form.getValues("unit").toLowerCase()}
                      </li>
                      <li>
                        {(parseFloat(field.value ?? "0") * 100_000).toFixed(8)}{" "}
                        USD / 100k {form.getValues("unit").toLowerCase()}
                      </li>
                      <li>
                        {(parseFloat(field.value ?? "0") * 1_000_000).toFixed(
                          8,
                        )}{" "}
                        USD / 1M {form.getValues("unit").toLowerCase()}
                      </li>
                    </ul>
                  </FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("models.form.totalPriceLabel", {
                    unit: t(`models.Unit.${form.getValues("unit")}`),
                  })}
                </FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                <FormDescription>
                  {field.value !== null && field.value !== "" ? (
                    <ul className="mt-2 font-mono text-xs">
                      <li>
                        {(parseFloat(field.value ?? "0") * 1000).toFixed(8)} USD
                        / 1k {form.getValues("unit").toLowerCase()}
                      </li>
                      <li>
                        {(parseFloat(field.value ?? "0") * 100_000).toFixed(8)}{" "}
                        USD / 100k {form.getValues("unit").toLowerCase()}
                      </li>
                      <li>
                        {(parseFloat(field.value ?? "0") * 1_000_000).toFixed(
                          8,
                        )}{" "}
                        USD / 1M {form.getValues("unit").toLowerCase()}
                      </li>
                    </ul>
                  ) : t("models.form.Enter total price")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Header level="h3" title={t("models.form.tokenizationHeader")} />
        <FormField
          control={form.control}
          name="tokenizerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("models.form.tokenizerLabel")}</FormLabel>
              <Select
                onValueChange={(tokenizerId) => {
                  field.onChange(tokenizerId);
                  if (tokenizerId === "None") {
                    form.setValue("tokenizerConfig", "{}");
                  }
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["openai", "claude", "None"].map((unit) => (
                    <SelectItem value={unit} key={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t("models.form.tokenizerDescription")} {" "}
                {/* <Link
                  href="https://langfuse.com/docs/model-usage-and-cost"
                  className="underline"
                  target="_blank"
                >
                  {t("models.form.docsLinkText")}
                </Link> */}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("tokenizerId") !== "None" && (
          <FormField
            control={form.control}
            name="tokenizerConfig"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("models.form.tokenizerConfigLabel")}</FormLabel>
                <JsonEditor
                  defaultValue={field.value}
                  onChange={field.onChange}
                />
                <FormDescription>
                  {t("models.form.tokenizerConfigDescription")}
                  {/* <Link
                    href="https://langfuse.com/docs/model-usage-and-cost"
                    className="underline"
                    target="_blank"
                  >
                    {t("models.form.docsLinkText")}
                  </Link>{" "} */}
                  {t("models.form.docsLinkText")}
                  {t("models.form.forDetails")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button
          type="submit"
          loading={createModelMutation.isLoading}
          className="mt-3"
        >
          {t("buttons.Save")}
        </Button>
      </form>
      {formError ? (
        <p className="text-red text-center">
          <span className="font-bold">{t("models.form.errorPrefix")}</span> {formError}
        </p>
      ) : null}
    </Form>
  );
};
