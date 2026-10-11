import { log } from "./logger";
import { hasPublicSupabase } from "./supabase/config";
import { publicClient } from "./supabase/clients";
import type { ReferenceInput } from "./validation";

export interface Reference {
  id?: string;
  name: string;
  title: string;
  company: string;
  quote: string;
  linkUrl: string | null;
  published: boolean;
  sortOrder: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const referenceFromRow = (r: any): Reference => ({
  id: r.id, name: r.name, title: r.title ?? "", company: r.company ?? "", quote: r.quote, linkUrl: r.link_url ?? null, published: r.published, sortOrder: r.sort_order ?? 0,
});
export const referenceToRow = (i: ReferenceInput) => ({ name: i.name, title: i.title, company: i.company, quote: i.quote, link_url: i.linkUrl, published: i.published, sort_order: i.sortOrder });

/** Published references for the public site. An empty list simply hides the section. */
export async function getPublishedReferences(): Promise<Reference[]> {
  if (!hasPublicSupabase()) return [];
  try {
    const { data, error } = await publicClient().from("references_list").select("*").eq("published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(referenceFromRow);
  } catch (err) {
    log("error", "references.read_failed", { message: err instanceof Error ? err.message : "unknown" });
    return [];
  }
}
