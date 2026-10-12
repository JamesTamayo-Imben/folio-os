import { site, type SiteProfile } from "@/config/site";
import { log } from "./logger";
import { hasPublicSupabase } from "./supabase/config";
import { publicClient } from "./supabase/clients";

/** Loads the editable profile, falling back to the source-controlled defaults. */
export async function getSiteProfile(): Promise<SiteProfile> {
  if (!hasPublicSupabase()) return site;
  try {
    const { data, error } = await publicClient().from("site_profile").select("profile").eq("id", true).maybeSingle();
    if (error) throw error;
    if (!data?.profile) return site;
    const { journeyPhotos: _journeyPhotos, availableDates: _availableDates, ...profile } = data.profile as Record<string, unknown>;
    return { ...site, ...profile } as SiteProfile;
  } catch (err) {
    log("error", "site_profile.read_failed", { message: err instanceof Error ? err.message : "unknown" });
    return site;
  }
}