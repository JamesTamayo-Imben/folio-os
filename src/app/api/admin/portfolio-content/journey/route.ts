import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardAdmin, isResponse, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { journeyPhotosSchema } from "@/lib/portfolio-content";
import { serviceClient } from "@/lib/supabase/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  const { data, error } = await serviceClient().from("site_portfolio_content").select("journey_photos").eq("id", true).maybeSingle();
  if (error) return errorResponse(500, "INTERNAL", "Could not load Journey Gallery data. Confirm site_portfolio_content exists by running the latest supabase/schema.sql.", requestId);
  return NextResponse.json({ photos: data?.journey_photos ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const badType = requireJson(req, requestId);
  if (badType) return badType;
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse(400, "BAD_REQUEST", "Send valid JSON.", requestId); }
  const parsed = journeyPhotosSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, "VALIDATION_FAILED", "Check the journey photo list.", requestId, { fields: parsed.error.flatten().fieldErrors });
  const db = serviceClient();
  const { data: current, error: readError } = await db.from("site_portfolio_content").select("unavailable_dates,weekly_unavailable_days,monthly_unavailable_days").eq("id", true).maybeSingle();
  if (readError) return errorResponse(500, "INTERNAL", "Could not save Journey Gallery. Confirm site_portfolio_content exists by running the latest supabase/schema.sql.", requestId);
  const { error } = await db.from("site_portfolio_content").upsert({ id: true, journey_photos: parsed.data, available_dates: [], unavailable_dates: current?.unavailable_dates ?? [], weekly_unavailable_days: current?.weekly_unavailable_days ?? [], monthly_unavailable_days: current?.monthly_unavailable_days ?? [] }, { onConflict: "id" });
  if (error) return errorResponse(500, "INTERNAL", "Could not save Journey Gallery. Confirm site_portfolio_content exists and matches the latest supabase/schema.sql.", requestId);
  revalidatePath("/");
  return NextResponse.json({ photos: parsed.data }, { headers: { "cache-control": "no-store" } });
}
