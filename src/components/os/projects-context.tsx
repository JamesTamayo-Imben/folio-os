"use client";
import { createContext, useContext } from "react";
import type { Project } from "@/data/projects";
import type { Reference } from "@/lib/referencesRepo";
import { APP_META, type Win } from "@/lib/store";

const ProjectsCtx = createContext<Project[]>([]);
const ReferencesCtx = createContext<Reference[]>([]);

export function ProjectsProvider({ projects, references = [], children }: { projects: Project[]; references?: Reference[]; children: React.ReactNode }) {
  return (
    <ProjectsCtx.Provider value={projects}>
      <ReferencesCtx.Provider value={references}>{children}</ReferencesCtx.Provider>
    </ProjectsCtx.Provider>
  );
}

export const useProjects = () => useContext(ProjectsCtx);
export const useProject = (slug?: string | null) => useContext(ProjectsCtx).find((p) => p.slug === slug);
export const useReferences = () => useContext(ReferencesCtx);

/** Case study windows show the project's own title. */
export function useWinTitle(win: Pick<Win, "app" | "param" | "title">) {
  const project = useProject(win.app === "case" ? win.param : undefined);
  return win.app === "case" ? (project?.title ?? APP_META.case.title) : win.title;
}
