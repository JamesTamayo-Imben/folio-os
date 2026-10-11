import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteComment, setCommentStatus } from "@/lib/comments";
import { guardAdmin, isResponse, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { commentStatusSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export async function DELETE(req: Request, ctx: Ctx) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return errorResponse(400, "BAD_ID", "That comment id is not valid.", requestId);
  try {
    const removed = await deleteComment(id.data);
    if (!removed) return errorResponse(404, "NOT_FOUND", "That comment no longer exists.", requestId);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.comment_delete_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not delete the comment.", requestId);
  }
}

/** Approve a pending comment, or send an approved one back to pending (hide it). */
export async function PATCH(req: Request, ctx: Ctx) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  const bad = requireJson(req, requestId);
  if (bad) return bad;
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return errorResponse(400, "BAD_ID", "That comment id is not valid.", requestId);
  const body = commentStatusSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return errorResponse(422, "VALIDATION_FAILED", "Status must be pending or approved.", requestId);
  try {
    const ok = await setCommentStatus(id.data, body.data.status);
    if (!ok) return errorResponse(404, "NOT_FOUND", "That comment no longer exists.", requestId);
    return NextResponse.json({ ok: true, status: body.data.status }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.comment_status_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not update the comment.", requestId);
  }
}
