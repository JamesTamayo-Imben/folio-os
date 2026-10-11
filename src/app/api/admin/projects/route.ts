import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardAdmin, isResponse, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { getAllProjectsForAdmin, inputToRow, rowToProject } from "@/lib/projectsRepo";
import { serviceClient } from "@/lib/supabase/clients";
import { projectInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ data: await getAllProjectsForAdmin() }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.projects_list_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not load projects.", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const bad = requireJson(req, requestId);
  if (bad) return bad;

  const parsed = projectInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Fix the highlighted fields.", requestId, { fields: parsed.error.flatten().fieldErrors });
  }

  const { data, error } = await serviceClient().from("projects").insert(inputToRow(parsed.data)).select("*").single();
  if (error) {
    if (error.code === "23505") return errorResponse(409, "SLUG_TAKEN", "Another project already uses that slug.", requestId, { fields: { slug: ["Slug already in use."] } });
    log("error", "admin.project_create_failed", { requestId, code: error.code });
    return errorResponse(500, "INTERNAL", "Could not create the project.", requestId);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ data: rowToProject(data) }, { status: 201, headers: { "cache-control": "no-store" } });
}
