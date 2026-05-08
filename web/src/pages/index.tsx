import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import Link from "next/link";
import { NewProjectButton } from "@/src/features/projects/components/NewProjectButton";
import Header from "@/src/components/layouts/header";
import { useRouter } from "next/router";
import { env } from "@/src/env.mjs";
import { cn } from "@/src/utils/tailwind";
import { useSession } from "next-auth/react";
import { Spinner } from "@/src/components/layouts/spinner";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function GetStartedPage() {
  const { t } = useLanguage()
  const router = useRouter();
  const getStarted = router.query.getStarted === "1";

  const session = useSession();
  const projects = session.data?.user?.projects;
  const redirectProject = projects?.filter(
    (p) => p.id !== env.NEXT_PUBLIC_DEMO_PROJECT_ID,
  )[0];

  if (session.status === "authenticated" && redirectProject && !getStarted) {
    void router.push(`/project/${redirectProject.id}`);
    return <Spinner message={t('common.redirecting')} />;
  }

  if (session.status === "loading") {
    return <Spinner message={t('common.loading')} />;
  }

  const demoProject =
    env.NEXT_PUBLIC_DEMO_PROJECT_ID !== undefined
      ? projects?.find(
        (project) => project.id === env.NEXT_PUBLIC_DEMO_PROJECT_ID,
      )
      : undefined;

  return (
    <div className="md:container">
      <Header
        title={t("index.Title")}
      // actionButtons={
      //   <Button asChild>
      //     <Link href="https://docs.langfuse.com">{t("index.Visit docs")}</Link>
      //   </Button>
      // }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle data-testid="create-new-project-title">
              {t("index.Create new project")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("index.CreateProject Description")}</p>
          </CardContent>
          <CardFooter>
            <NewProjectButton />
          </CardFooter>
        </Card>
        {demoProject ? (
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>{t("index.View demo project")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                {t("index.ViewDemo.Description", { name: demoProject.name })}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={"/project/" + demoProject.id}>
                  {t("index.Go to demo project")}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}
        {/* <Card className={cn(demoProject && "col-span-full")}>
          <CardHeader>
            <CardTitle>{t("index.Guided onboarding")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("index.Guided Description")}</p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="https://cal.com/marc-kl/langfuse-cloud">
                {t("index.Schedule call")}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="https://discord.gg/7NXusRtqYU">{t("index.Discord")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="mailto:onboarding@langfuse.com">{t("index.Email")}</Link>
            </Button>
          </CardFooter>
        </Card> */}
      </div>
    </div>
  );
}
