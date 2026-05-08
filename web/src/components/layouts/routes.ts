import { type Flag } from "@/src/features/feature-flags/types";
import { type Scope } from "@/src/features/rbac/constants/roleAccessRights";
import {
  Database,
  LayoutDashboard,
  LifeBuoy,
  ListTree,
  type LucideIcon,
  Settings,
  UsersIcon,
  PenSquareIcon,
  LibraryBig,
  TerminalIcon,
  Lightbulb,
} from "lucide-react";

export type Route = {
  name: string;
  featureFlag?: Flag;
  label?: string;
  rbacScope?: Scope;
  icon?: string; // ignored for nested routes
  pathname?: string; // link, ignored if children
  children?: Array<Route>; // folder
  bottom?: boolean; // bottom of the sidebar, only for first level routes
  newTab?: boolean; // open in new tab
  requires?: "cloud" | "cloud-or-ee"; // feature requires cloud or ee
};

export const ROUTES: Route[] = [
  {
    name: "navigation.dashboard",
    pathname: `/project/[projectId]`,
    icon: "dashboard",
  },
  {
    name: "navigation.tracing",
    icon: "tracing",
    children: [
      {
        name: "navigation.traces",
        pathname: `/project/[projectId]/traces`,
      },
      {
        name: "navigation.sessions",
        pathname: `/project/[projectId]/sessions`,
      },
      {
        name: "navigation.generations",
        pathname: `/project/[projectId]/generations`,
      },
      {
        name: "navigation.scores",
        pathname: `/project/[projectId]/scores`,
      },
      {
        name: "navigation.models",
        pathname: `/project/[projectId]/models`,
      },
    ],
  },
  // {
  //   name: "navigation.evaluation",
  //   icon: Lightbulb,
  //   requires: "cloud",
  //   children: [
  //     {
  //       name: "navigation.templates",
  //       pathname: `/project/[projectId]/evals/templates`,
  //       requires: "cloud",
  //       rbacScope: "evalTemplate:read",
  //     },
  //     {
  //       name: "navigation.configs",
  //       pathname: `/project/[projectId]/evals/configs`,
  //       requires: "cloud",
  //       rbacScope: "evalJob:read",
  //     },
  //     {
  //       name: "navigation.log",
  //       pathname: `/project/[projectId]/evals/log`,
  //       requires: "cloud",
  //       rbacScope: "evalJobExecution:read",
  //     },
  //   ],
  // },
  {
    name: "navigation.users",
    pathname: `/project/[projectId]/users`,
    icon: "users",
  },
  {
    name: "navigation.prompts",
    pathname: "/project/[projectId]/prompts",
    icon: "prompts",
    rbacScope: "prompts:read",
  },
  {
    name: "navigation.playground",
    pathname: "/project/[projectId]/playground",
    icon: "playground",
    requires: "cloud-or-ee",
  },
  {
    name: "navigation.datasets",
    pathname: `/project/[projectId]/datasets`,
    icon: "datasets",
  },
  // {
  //   name: "navigation.settings",
  //   pathname: "/project/[projectId]/settings",
  //   icon: Settings,
  //   bottom: true,
  // },
  // {
  //   name: "navigation.docs",
  //   pathname: "https://langfuse.com/docs",
  //   icon: LibraryBig,
  //   bottom: true,
  //   newTab: true,
  // },
  // {
  //   name: "navigation.support",
  //   pathname: "/project/[projectId]/support",
  //   icon: LifeBuoy,
  //   bottom: true,
  // },
];
