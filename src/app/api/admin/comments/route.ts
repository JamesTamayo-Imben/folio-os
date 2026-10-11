import { NextResponse } from "next/server";
import { z } from "zod";
import { listAllCommentsForAdmin } from "@/lib/comments";
import { guardAdmin, isResponse } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { commentsQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const query = commentsQuerySchema.extend({ status: z.enum(["pending", "approved"]).optional() });

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  const q = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return errorResponse(422, "VALIDATION_FAILED", "Check the query parameters.", requestId);
  try {
    return NextResponse.json(await listAllCommentsForAdmin(q.data.page, q.data.limit, q.data.status), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log("error", "admin.comments_list_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not load comments.", requestId);
  }
}
