import { NextResponse } from "next/server";
import { getInsights } from "@/lib/events";
import { guardAdmin, isResponse } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json(await getInsights(), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.insights_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not load insights. Did you run the latest supabase/schema.sql?", requestId);
  }
}
