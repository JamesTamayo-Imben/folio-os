import { log } from "./logger";
import { hasAdminSupabase } from "./supabase/config";
import { serviceClient } from "./supabase/clients";

export interface EventInput {
  type: "view" | "project_open" | "resume_download" | "hire_open" | "contact_send" | "application_view";
  project?: string;
  application?: string;
  referrer?: string;
}

/** Best-effort analytics write. Never throws: a failed event must not break a page or a form. */
export async function recordEvent(e: EventInput): Promise<void> {
  if (!hasAdminSupabase()) return;
  try {
    const db = serviceClient();
    const { error } = await db.from("events").insert({ type: e.type, project_slug: e.project ?? null, application_slug: e.application ?? null, referrer_host: e.referrer ?? null });
    if (error) throw error;
    if (e.type === "application_view" && e.application) await db.rpc("touch_application", { p_slug: e.application });
  } catch (err) {
    log("warn", "events.record_failed", { type: e.type, message: err instanceof Error ? err.message : "unknown" });
  }
}

export interface Insights {
  days: number;
  totals: { views: number; projectOpens: number; resumeDownloads: number; hireOpens: number; contactSends: number; applicationViews: number };
  topProjects: { slug: string; count: number }[];
  referrers: { host: string; count: number }[];
  daily: { date: string; views: number }[];
}

const DAYS = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function summarize(rows: { type: string; project_slug: string | null; referrer_host: string | null; created_at: string }[], now = new Date()): Insights {
  const totals = { views: 0, projectOpens: 0, resumeDownloads: 0, hireOpens: 0, contactSends: 0, applicationViews: 0 };
  const projects = new Map<string, number>();
  const refs = new Map<string, number>();
  const perDay = new Map<string, number>();

  for (let i = DAYS - 1; i >= 0; i--) perDay.set(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10), 0);

  for (const r of rows) {
    if (r.type === "view") {
      totals.views++;
      const d = r.created_at.slice(0, 10);
      if (perDay.has(d)) perDay.set(d, (perDay.get(d) ?? 0) + 1);
      if (r.referrer_host) refs.set(r.referrer_host, (refs.get(r.referrer_host) ?? 0) + 1);
    } else if (r.type === "project_open") {
      totals.projectOpens++;
      if (r.project_slug) projects.set(r.project_slug, (projects.get(r.project_slug) ?? 0) + 1);
    } else if (r.type === "resume_download") totals.resumeDownloads++;
    else if (r.type === "hire_open") totals.hireOpens++;
    else if (r.type === "contact_send") totals.contactSends++;
    else if (r.type === "application_view") totals.applicationViews++;
  }
  const top = <K extends string>(m: Map<string, number>, key: K) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, count]) => ({ [key]: k, count }) as any);
  return { days: DAYS, totals, topProjects: top(projects, "slug"), referrers: top(refs, "host"), daily: [...perDay].map(([date, views]) => ({ date, views })) };
}

export async function getInsights(): Promise<Insights> {
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const { data, error } = await serviceClient().from("events").select("type,project_slug,referrer_host,created_at").gte("created_at", since).limit(20000);
  if (error) throw error;
  return summarize(data ?? []);
}
