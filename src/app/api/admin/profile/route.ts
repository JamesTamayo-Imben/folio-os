import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardAdmin, isResponse, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { serviceClient } from "@/lib/supabase/clients";
import { siteProfileSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  try {
    const { data, error } = await serviceClient().from("site_profile").select("profile").eq("id", true).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ profile: data?.profile ?? null }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.profile_read_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not load the profile. Run the latest supabase/schema.sql.", requestId);
  }
}

export async function PUT(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const badType = requireJson(req, requestId);
  if (badType) return badType;
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse(400, "BAD_REQUEST", "Send valid JSON.", requestId); }
  const parsed = siteProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Check the highlighted profile fields.", requestId, { fields: parsed.error.flatten().fieldErrors });
  }
  try {
    const { error } = await serviceClient().from("site_profile").upsert({ id: true, profile: parsed.data }, { onConflict: "id" });
    if (error) throw error;
    revalidatePath("/", "layout");
    return NextResponse.json({ profile: parsed.data }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.profile_save_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not save the profile. Run the latest supabase/schema.sql.", requestId);
  }
}