import { randomUUID } from "node:crypto";
import { MIN_RATINGS_FOR_AVERAGE } from "@/config/site";
import { hasAdminSupabase, hasPublicSupabase } from "./supabase/config";
import { publicClient, serviceClient } from "./supabase/clients";

export type CommentStatus = "pending" | "approved";

export interface Comment {
  id: string;
  projectSlug: string;
  name: string;
  rating: number;
  body: string;
  status: CommentStatus;
  createdAt: string;
}

export interface CommentList {
  data: Comment[];
  total: number;
  /** Null until there are enough approved reviews (see MIN_RATINGS_FOR_AVERAGE). */
  average: number | null;
  page: number;
  limit: number;
}

export class NotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured");
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Comment => ({ id: r.id, projectSlug: r.project_slug, name: r.name, rating: r.rating, body: r.body, status: r.status ?? "approved", createdAt: r.created_at });

/* ---------- In-memory store: local development only, when Supabase is not configured ---------- */
const memory: Comment[] = [];
const useMemory = () => !hasPublicSupabase() && process.env.NODE_ENV !== "production";
export const __resetMemoryComments = () => (memory.length = 0);

/** New comments wait for approval unless moderation is switched off (COMMENTS_MODERATION=off) or you are on the local dev store. */
export const moderationOn = () => !useMemory() && process.env.COMMENTS_MODERATION !== "off";

const round1 = (n: number) => Math.round(n * 10) / 10;
const averageOf = (ratings: number[], min: number) => (ratings.length >= min ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null);

export async function listComments({ project, page, limit }: { project?: string; page: number; limit: number }): Promise<CommentList> {
  if (useMemory()) {
    const all = memory.filter((c) => c.status === "approved" && (!project || c.projectSlug === project)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { data: all.slice((page - 1) * limit, page * limit), total: all.length, average: averageOf(all.map((c) => c.rating), MIN_RATINGS_FOR_AVERAGE), page, limit };
  }
  if (!hasPublicSupabase()) throw new NotConfiguredError();

  // Row Level Security already limits the anon client to approved comments; the filter keeps that explicit.
  const db = publicClient();
  let q = db.from("comments").select("*", { count: "exact" }).eq("status", "approved").order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  let r = db.from("comments").select("rating").eq("status", "approved").limit(5000);
  if (project) {
    q = q.eq("project_slug", project);
    r = r.eq("project_slug", project);
  }
  const [list, ratings] = await Promise.all([q, r]);
  if (list.error) throw list.error;
  const rs = (ratings.data ?? []).map((x: any) => x.rating as number);
  return { data: (list.data ?? []).map(fromRow), total: list.count ?? 0, average: averageOf(rs, MIN_RATINGS_FOR_AVERAGE), page, limit };
}

export async function addComment(input: { project: string; name: string; rating: number; body: string }): Promise<Comment> {
  const status: CommentStatus = moderationOn() ? "pending" : "approved";
  if (useMemory()) {
    const c: Comment = { id: randomUUID(), projectSlug: input.project, name: input.name, rating: input.rating, body: input.body, status, createdAt: new Date().toISOString() };
    memory.push(c);
    return c;
  }
  if (!hasAdminSupabase()) throw new NotConfiguredError();
  const { data, error } = await serviceClient()
    .from("comments")
    .insert({ project_slug: input.project, name: input.name, rating: input.rating, body: input.body, status })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteComment(id: string): Promise<boolean> {
  if (!hasAdminSupabase()) throw new NotConfiguredError();
  const { error, count } = await serviceClient().from("comments").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function setCommentStatus(id: string, status: CommentStatus): Promise<boolean> {
  if (!hasAdminSupabase()) throw new NotConfiguredError();
  const { data, error } = await serviceClient().from("comments").update({ status }).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function listAllCommentsForAdmin(page: number, limit: number, status?: CommentStatus): Promise<CommentList & { pending: number }> {
  if (!hasAdminSupabase()) throw new NotConfiguredError();
  const db = serviceClient();
  let q = db.from("comments").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (status) q = q.eq("status", status);
  const [list, approved, pending] = await Promise.all([
    q,
    db.from("comments").select("rating").eq("status", "approved").limit(5000),
    db.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (list.error) throw list.error;
  const rs = (approved.data ?? []).map((x: any) => x.rating as number);
  return { data: (list.data ?? []).map(fromRow), total: list.count ?? 0, average: averageOf(rs, 1), page, limit, pending: pending.count ?? 0 };
}
