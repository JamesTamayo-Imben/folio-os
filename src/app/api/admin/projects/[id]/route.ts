import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin, isResponse, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { inputToRow, rowToProject } from "@/lib/projectsRepo";
import { serviceClient } from "@/lib/supabase/clients";
import { projectInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const bad = requireJson(req, requestId);
  if (bad) return bad;

  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return errorResponse(400, "BAD_ID", "That project id is not valid.", requestId);

  const parsed = projectInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Fix the highlighted fields.", requestId, { fields: parsed.error.flatten().fieldErrors });
  }

  const { data, error } = await serviceClient().from("projects").update(inputToRow(parsed.data)).eq("id", id.data).select("*").maybeSingle();
  if (error) {
    if (error.code === "23505") return errorResponse(409, "SLUG_TAKEN", "Another project already uses that slug.", requestId, { fields: { slug: ["Slug already in use."] } });
    log("error", "admin.project_update_failed", { requestId, code: error.code });
    return errorResponse(500, "INTERNAL", "Could not save the project.", requestId);
  }
  if (!data) return errorResponse(404, "NOT_FOUND", "That project no longer exists.", requestId);
  revalidatePath("/", "layout");
  return NextResponse.json({ data: rowToProject(data) }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;

  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return errorResponse(400, "BAD_ID", "That project id is not valid.", requestId);

  const { error } = await serviceClient().from("projects").delete().eq("id", id.data);
  if (error) {
    log("error", "admin.project_delete_failed", { requestId, code: error.code });
    return errorResponse(500, "INTERNAL", "Could not delete the project.", requestId);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
