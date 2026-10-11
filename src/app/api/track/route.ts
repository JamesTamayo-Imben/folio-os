import { checkOrigin, requireJson } from "@/lib/guard";
import { recordEvent } from "@/lib/events";
import { errorResponse } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { trackSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Privacy-friendly analytics: no cookies, no IP address or user agent stored.
 * Only an event type, an optional project, and the referring site's hostname.
 */
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const bad = checkOrigin(req, requestId) ?? requireJson(req, requestId);
  if (bad) return bad;

  const rl = rateLimit(`track:${clientIp(req)}`, { limit: 200, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return errorResponse(429, "RATE_LIMITED", "Too many events.", requestId, { headers: { "retry-after": String(rl.retryAfterSec) } });

  const raw = await req.text().catch(() => "");
  if (raw.length > 1000) return errorResponse(413, "PAYLOAD_TOO_LARGE", "Event too large.", requestId);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse(400, "INVALID_JSON", "The request body is not valid JSON.", requestId);
  }
  const parsed = trackSchema.safeParse(json);
  if (!parsed.success) return errorResponse(422, "VALIDATION_FAILED", "Unknown event.", requestId);

  await recordEvent(parsed.data); // never throws; a no-op when Supabase is not configured
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
