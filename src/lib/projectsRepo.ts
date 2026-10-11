import { projects as seed, type Palette, type Project, type Shape, type Kind } from "@/data/projects";
import { log } from "./logger";
import { hasAdminSupabase, hasPublicSupabase } from "./supabase/config";
import { publicClient, serviceClient } from "./supabase/clients";
import type { ProjectInput } from "./validation";

const DEFAULT_PALETTE: Palette = ["#4b57d6", "#c4478f", "#1a8f9a", "#0d1020"];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToProject(r: any): Project {
  const pal = Array.isArray(r.palette) && r.palette.length === 4 ? (r.palette as Palette) : DEFAULT_PALETTE;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.kind as Kind,
    year: r.year,
    role: r.role ?? "",
    tools: r.tools ?? [],
    summary: r.summary ?? "",
    problem: r.problem ?? "",
    process: Array.isArray(r.process) ? r.process : [],
    result: r.result ?? "",
    palette: pal,
    shape: r.shape as Shape,
    coverUrl: r.cover_url ?? null,
    images: r.images ?? [],
    published: r.published,
    sortOrder: r.sort_order ?? 0,
  };
}

export function inputToRow(i: ProjectInput) {
  return {
    slug: i.slug,
    title: i.title,
    kind: i.kind,
    year: i.year,
    role: i.role,
    tools: i.tools,
    summary: i.summary,
    problem: i.problem,
    process: i.process,
    result: i.result,
    palette: i.palette,
    shape: i.shape,
    cover_url: i.coverUrl,
    images: i.images,
    published: i.published,
    sort_order: i.sortOrder,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Published projects for the public site.
 * Supabase is the source of truth when configured; otherwise the sample data is used.
 */
export async function getPublishedProjects(): Promise<Project[]> {
  if (!hasPublicSupabase()) return seed;
  try {
    const { data, error } = await publicClient().from("projects").select("*").eq("published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToProject);
  } catch (err) {
    log("error", "projects.read_failed", { message: err instanceof Error ? err.message : "unknown" });
    return seed;
  }
}

export async function getPublishedProject(slug: string) {
  return (await getPublishedProjects()).find((p) => p.slug === slug);
}

/** Admin view: includes unpublished drafts. */
export async function getAllProjectsForAdmin(): Promise<Project[]> {
  if (!hasAdminSupabase()) return [];
  const { data, error } = await serviceClient().from("projects").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToProject);
}
