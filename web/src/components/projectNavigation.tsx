import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { cn } from "@/src/utils/tailwind";
import { useRouter } from "next/router";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { ChevronDown } from 'lucide-react';
import MyIcon from "./icons/MyIcon";

interface Project {
  id: string;
  name: string;
  role: string;
}

interface ProjectNavigationProps {
  currentProjectId: string;
  projects: Project[];
}

export const ProjectNavigation: React.FC<ProjectNavigationProps> = ({
  currentProjectId,
  projects,
}) => {
  const router = useRouter();
  const { t } = useLanguage();

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 min-w-32 max-w-64 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            "truncate"
          )}
        >
          <span className="truncate font-semibold">
            {currentProject?.name ?? currentProjectId}
          </span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="max-h-60 w-[--radix-dropdown-menu-trigger-width] overflow-y-auto"
      >
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} className="p-0">
            <div className="flex items-center w-full px-1 py-1">
              <button
                onClick={() => router.push(`/project/${project.id}`)}
                className={cn(
                  "text-left truncate font-semibold flex-1 text-sm",
                  currentProjectId === project.id
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {project.name}
              </button>

              {project.role === "VIEWER" ? (
                <span
                  className={cn(
                    "whitespace-nowrap rounded-sm border px-1 py-0.5 text-xs ml-2",
                    currentProjectId === project.id
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {t("common.view-only")}
                </span>
              ) : (
                <button
                  aria-label="Project settings"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/project/${project.id}/settings`);
                  }}
                  className="ml-2 flex-shrink-0"
                >
                  <MyIcon name="setting" size={20} />
                </button>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};