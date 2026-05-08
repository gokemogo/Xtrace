import { CodeView } from "@/src/components/ui/CodeJsonViewer";
import {
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";

export const QuickstartExamples = ({
  secretKey,
  publicKey,
  host,
}: {
  secretKey: string;
  publicKey: string;
  host: string;
}) => {
  const { t } = useLanguage()
  const capture = usePostHogClientCapture();
  const tabs = [
    { value: "python", label: "Python" },
    { value: "js", label: "JS/TS" },
    { value: "openai", label: "OpenAI" },
    { value: "langchain", label: "Langchain" },
    { value: "langchain-js", label: "Langchain JS" },
    { value: "llamaindex", label: "LlamaIndex" },
    { value: "other", label: "Other" },
  ];

  return (
    <Tabs defaultValue="python" className="relative max-w-full">
      <div className="overflow-x-scroll">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              onClick={() =>
                capture("onboarding:code_example_tab_switch", {
                  tabLabel: tab.value,
                })
              }
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="python">
        <CodeView content="pip install langfuse" className="mb-2 bg-muted" />
        <CodeView
          className="bg-muted"
          content={`from langfuse import Langfuse\n\nlangfuse = Langfuse(\n  secret_key="${secretKey}",\n  public_key="${publicKey}",\n  host="${host}"\n)`}
        />
        {/* <p className="mt-3 text-xs text-muted-foreground">
          {t("settings.See")}{" "}
          <a
            href="https://langfuse.com/docs/get-started"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Quickstart
          </a>{" "}
          {t("settings.and")}{" "}
          <a
            href="https://langfuse.com/docs/sdk/python"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Python docs
          </a>{" "}
          {t("settings.details example")}
        </p> */}
      </TabsContent>
      <TabsContent value="js">
        <CodeView content="npm install langfuse" className="mb-2 bg-muted" />
        <CodeView
          className="bg-muted"
          content={`import { Langfuse } from "langfuse";\n\nconst langfuse = new Langfuse({\n  secretKey: "${secretKey}",\n  publicKey: "${publicKey}",\n  baseUrl: "${host}"\n});`}
        />
        {/* <p className="mt-3 text-xs text-muted-foreground">
          {t("settings.See")}{" "}
          <a
            href="https://langfuse.com/docs/get-started"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Quickstart
          </a>{" "}
          {t("settings.and")}{" "}
          <a
            href="https://langfuse.com/docs/sdk/typescript"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            JS/TS docs
          </a>{" "}
          {t("settings.details example")}
        </p> */}
      </TabsContent>
      <TabsContent value="openai">
        <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.OpenAI")}
        </p>
        <CodeView content="pip install langfuse" className="my-2 bg-muted" />
        <CodeView
          title=".env"
          content={`LANGFUSE_SECRET_KEY=${secretKey}\nLANGFUSE_PUBLIC_KEY=${publicKey}\nLANGFUSE_HOST="${host}"`}
          className="my-2 bg-muted"
        />
        <CodeView
          content={`# remove: import openai\n\nfrom langfuse.openai import openai`}
          className="my-2 bg-muted"
        />
        {/* <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.OpenAI SDK")}{" "}
          <a
            href="https://langfuse.com/docs/integrations/openai"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenAI Integration docs
          </a>{" "}
          {t("settings.details example")}
        </p> */}
      </TabsContent>
      <TabsContent value="langchain">
        <p className="mt-2 text-xs text-muted-foreground">
          {t('settings.Langchain')}
        </p>
        <CodeView content="pip install langfuse" className="my-2 bg-muted" />
        <CodeView
          content={LANGCHAIN_PYTHON_CODE({ publicKey, secretKey, host })}
          className="my-2 bg-muted"
        />
        {/* <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.See")}{" "}
          <a
            href="https://langfuse.com/docs/integrations/langchain/python"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Langchain Integration docs
          </a>{" "}
          {t("settings.details example")}
        </p> */}
      </TabsContent>
      <TabsContent value="langchain-js">
        <p className="mt-2 text-xs text-muted-foreground">
          {t('settings.Langchain')}
        </p>
        <CodeView
          content="npm install langfuse-langchain"
          className="my-2 bg-muted"
        />
        <CodeView
          content={LANGCHAIN_JS_CODE({ publicKey, secretKey, host })}
          className="my-2 bg-muted"
        />
        {/* <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.See")}{" "}
          <a
            href="https://langfuse.com/docs/integrations/langchain/typescript"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Langchain Integration docs
          </a>{" "}
          {t("settings.details example")}
        </p> */}
      </TabsContent>
      <TabsContent value="llamaindex">
        <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.LlamaIndex")}
        </p>
        <CodeView
          content="pip install langfuse llama-index"
          className="my-2 bg-muted"
        />
        <CodeView
          content={LLAMA_INDEX_CODE({ publicKey, secretKey, host })}
          className="my-2 bg-muted"
        />
        {/* <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.See")}{" "}
          <a
            href="https://langfuse.com/docs/integrations/llama-index"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            LlamaIndex Integration docs
          </a>{" "}
          {t("settings.details example")}
        </p> */}
      </TabsContent>
      <TabsContent value="other">
        <p className="mt-2 text-xs text-muted-foreground">
          {t("settings.Use")}
          API
          {t("settings.or one")}
          {t("settings.integrate")}
        </p>
      </TabsContent>
    </Tabs>
  );
};
const LANGCHAIN_PYTHON_CODE = (p: {
  publicKey: string;
  secretKey: string;
  host: string;
}) => `from langfuse.callback import CallbackHandler
langfuse_handler = CallbackHandler(
    public_key="${p.publicKey}",
    secret_key="${p.secretKey}",
    host="${p.host}"
)

# <Your Langchain code here>
 
# Add handler to run/invoke/call/chat
chain.invoke({"input": "<user_input>"}, config={"callbacks": [langfuse_handler]})`;

const LANGCHAIN_JS_CODE = (p: {
  publicKey: string;
  secretKey: string;
  host: string;
}) => `import { CallbackHandler } from "langfuse-langchain";
 
// Initialize Langfuse callback handler
const langfuseHandler = new CallbackHandler({
  publicKey: "${p.publicKey}",
  secretKey: "${p.secretKey}",
  baseUrl: "${p.host}"
});
 
// Your Langchain implementation
const chain = new LLMChain(...);
 
// Add handler as callback when running the Langchain agent
await chain.invoke(
  { input: "<user_input>" },
  { callbacks: [langfuseHandler] }
);`;

const LLAMA_INDEX_CODE = (p: {
  publicKey: string;
  secretKey: string;
  host: string;
}) => `from llama_index.core import Settings
from llama_index.core.callbacks import CallbackManager
from langfuse.llama_index import LlamaIndexCallbackHandler
 
langfuse_callback_handler = LlamaIndexCallbackHandler(
    public_key="${p.publicKey}",
    secret_key="${p.secretKey}",
    host="${p.host}"
)
Settings.callback_manager = CallbackManager([langfuse_callback_handler])`;
