import { hasAdminSupabase } from "./supabase/config";
import { serviceClient } from "./supabase/clients";
import type { ApplicationInput } from "./validation";

export interface Application {
  id?: string;
  slug: string;
  company: string;
  role: string;
  stage: ApplicationInput["stage"];
  featuredSlug: string | null;
  note: string;
  internalNotes: string;
  views: number;
  lastViewedAt: string | null;
  createdAt?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const applicationFromRow = (r: any): Application => ({
  id: r.id, slug: r.slug, company: r.company, role: r.role ?? "", stage: r.stage, featuredSlug: r.featured_slug ?? null, note: r.note ?? "",
  internalNotes: r.internal_notes ?? "", views: r.views ?? 0, lastViewedAt: r.last_viewed_at ?? null, createdAt: r.created_at,
});
export const applicationToRow = (i: ApplicationInput) => ({ slug: i.slug, company: i.company, role: i.role, stage: i.stage, featured_slug: i.featuredSlug, note: i.note, internal_notes: i.internalNotes });

/** Public fields only: never expose internal notes or stage to a visitor. */
export interface PublicGreeting {
  slug: string;
  company: string;
  role: string;
  note: string;
  featuredSlug: string | null;
}

export async function getGreeting(slug: string): Promise<PublicGreeting | null> {
  if (!hasAdminSupabase() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const { data } = await serviceClient().from("applications").select("slug,company,role,note,featured_slug").eq("slug", slug).maybeSingle();
  return data ? { slug: data.slug, company: data.company, role: data.role ?? "", note: data.note ?? "", featuredSlug: data.featured_slug ?? null } : null;
}
