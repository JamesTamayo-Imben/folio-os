import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { recordEvent } from "@/lib/events";
import { sendContactEmail } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { contactSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 10_000;
const LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();

  // 1. Same-origin only. Browsers always send Origin on cross-site POSTs.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* invalid origin falls through to rejection */
    }
    if (!host || originHost !== host) {
      log("warn", "contact.bad_origin", { requestId });
      return errorResponse(403, "FORBIDDEN_ORIGIN", "This request came from an unexpected site.", requestId);
    }
  }

  // 2. Content type
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Send the message as JSON.", requestId);
  }

  // 3. Rate limit per client
  const ip = clientIp(req);
  const rl = rateLimit(`contact:${ip}`, LIMIT);
  if (!rl.ok) {
    log("warn", "contact.rate_limited", { requestId });
    return errorResponse(429, "RATE_LIMITED", `Too many messages. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s).`, requestId, {
      headers: { "retry-after": String(rl.retryAfterSec) },
    });
  }

  // 4. Body size and JSON
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return errorResponse(400, "BAD_REQUEST", "Could not read the request body.", requestId);
  }
  if (raw.length > MAX_BODY_CHARS) {
    return errorResponse(413, "PAYLOAD_TOO_LARGE", "That message is too large.", requestId);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse(400, "INVALID_JSON", "The request body is not valid JSON.", requestId);
  }

  // 5. Validate
  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Fix the highlighted fields and send again.", requestId, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  // 6. Honeypot: pretend success so bots learn nothing
  if (parsed.data.website) {
    log("info", "contact.honeypot", { requestId });
    return NextResponse.json({ ok: true, requestId }, { status: 202, headers: { "x-request-id": requestId } });
  }

  // 7. Deliver
  const result = await sendContactEmail(parsed.data, requestId);
  if (!result.ok) {
    return errorResponse(502, "DELIVERY_FAILED", `The message could not be sent. Email ${site.email} directly instead.`, requestId);
  }

  log("info", "contact.accepted", { requestId, mode: result.mode, ms: Date.now() - started });
  await recordEvent({ type: "contact_send" });
  return NextResponse.json(
    { ok: true, requestId },
    { status: 202, headers: { "x-request-id": requestId, "cache-control": "no-store", "x-ratelimit-remaining": String(rl.remaining) } },
  );
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { allow: "POST" } });
}
