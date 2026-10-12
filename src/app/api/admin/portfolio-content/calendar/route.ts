import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardAdmin, isResponse, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { monthlyUnavailableDaysSchema, unavailableDatesSchema, weeklyUnavailableDaysSchema } from "@/lib/portfolio-content";
import { serviceClient } from "@/lib/supabase/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  const { data, error } = await serviceClient().from("site_portfolio_content").select("unavailable_dates,weekly_unavailable_days,monthly_unavailable_days").eq("id", true).maybeSingle();
  if (error) return errorResponse(500, "INTERNAL", "Could not load Calendar dates. Confirm site_portfolio_content exists by running the latest supabase/schema.sql.", requestId);
  return NextResponse.json({ unavailableDates: data?.unavailable_dates ?? [], weeklyUnavailableDays: data?.weekly_unavailable_days ?? [], monthlyUnavailableDays: data?.monthly_unavailable_days ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const badType = requireJson(req, requestId);
  if (badType) return badType;
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse(400, "BAD_REQUEST", "Send valid JSON.", requestId); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse(400, "BAD_REQUEST", "Send unavailableDates, weeklyUnavailableDays, and monthlyUnavailableDays arrays.", requestId);
  const input = body as { unavailableDates?: unknown; weeklyUnavailableDays?: unknown; monthlyUnavailableDays?: unknown };
  const unavailable = unavailableDatesSchema.safeParse(input.unavailableDates);
  const weekly = weeklyUnavailableDaysSchema.safeParse(input.weeklyUnavailableDays);
  const monthly = monthlyUnavailableDaysSchema.safeParse(input.monthlyUnavailableDays);
  if (!unavailable.success || !weekly.success || !monthly.success) return errorResponse(422, "VALIDATION_FAILED", "Choose valid unavailable dates and recurrence rules.", requestId);
  const db = serviceClient();
  const { data: current, error: readError } = await db.from("site_portfolio_content").select("journey_photos").eq("id", true).maybeSingle();
  if (readError) return errorResponse(500, "INTERNAL", "Could not save Calendar dates. Confirm site_portfolio_content exists by running the latest supabase/schema.sql.", requestId);
  const { error } = await db.from("site_portfolio_content").upsert({ id: true, journey_photos: current?.journey_photos ?? [], available_dates: [], unavailable_dates: unavailable.data, weekly_unavailable_days: weekly.data, monthly_unavailable_days: monthly.data }, { onConflict: "id" });
  if (error) return errorResponse(500, "INTERNAL", "Could not save Calendar dates. Confirm site_portfolio_content exists and matches the latest supabase/schema.sql.", requestId);
  revalidatePath("/");
  return NextResponse.json({ unavailableDates: unavailable.data, weeklyUnavailableDays: weekly.data, monthlyUnavailableDays: monthly.data }, { headers: { "cache-control": "no-store" } });
}
