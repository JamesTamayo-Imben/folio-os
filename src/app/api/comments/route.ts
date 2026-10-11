import { NextResponse } from "next/server";
import { addComment, listComments, NotConfiguredError } from "@/lib/comments";
import { checkOrigin, requireJson } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { commentSchema, commentsQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 6_000;
const LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const parsed = commentsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Check the query parameters.", requestId, { fields: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await listComments(parsed.data);
    return NextResponse.json(result, { headers: { "x-request-id": requestId, "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } });
  } catch (err) {
    if (err instanceof NotConfiguredError) return errorResponse(503, "NOT_CONFIGURED", "Comments are not available yet.", requestId);
    log("error", "comments.list_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not load comments. Try again soon.", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  const bad = checkOrigin(req, requestId) ?? requireJson(req, requestId);
  if (bad) return bad;

  const rl = rateLimit(`comment:${clientIp(req)}`, LIMIT);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", `You are commenting too quickly. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s).`, requestId, {
      headers: { "retry-after": String(rl.retryAfterSec) },
    });
  }

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_CHARS) return errorResponse(413, "PAYLOAD_TOO_LARGE", "That comment is too large.", requestId);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse(400, "INVALID_JSON", "The request body is not valid JSON.", requestId);
  }

  const parsed = commentSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Fix the highlighted fields and send again.", requestId, { fields: parsed.error.flatten().fieldErrors });
  }

  // Honeypot: report success so bots learn nothing
  if (parsed.data.website) return NextResponse.json({ ok: true, requestId }, { status: 201 });

  try {
    if (parsed.data.project !== "general") {
      const exists = (await getPublishedProjects()).some((p) => p.slug === parsed.data.project);
      if (!exists) return errorResponse(422, "VALIDATION_FAILED", "That project does not exist.", requestId, { fields: { project: ["Pick a valid project."] } });
    }
    const { website: _ignored, ...input } = parsed.data;
    void _ignored;
    const comment = await addComment(input);
    log("info", "comments.created", { requestId, project: input.project, rating: input.rating, status: comment.status });
    const pending = comment.status === "pending";
    // A pending comment is not echoed back: it is not public yet.
    return NextResponse.json({ ok: true, pending, comment: pending ? undefined : comment, requestId }, { status: 201, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof NotConfiguredError) return errorResponse(503, "NOT_CONFIGURED", "Comments are not available yet.", requestId);
    log("error", "comments.create_failed", { requestId, message: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "INTERNAL", "Could not save your comment. Try again soon.", requestId);
  }
}
