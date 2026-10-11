import { NextResponse } from "next/server";
import { checkOrigin, requireJson, NOT_CONFIGURED } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { adminEmail, hasAdminSupabase } from "@/lib/supabase/config";
import { sessionClient } from "@/lib/supabase/clients";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deliberately vague so the response never reveals which part was wrong.
const FAIL = (id: string) => errorResponse(401, "INVALID_CREDENTIALS", "Email or password is incorrect.", id);

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const bad = checkOrigin(req, requestId) ?? requireJson(req, requestId);
  if (bad) return bad;
  if (!hasAdminSupabase()) return NOT_CONFIGURED(requestId);

  // Brute-force protection: 8 attempts per 15 minutes per client
  const rl = rateLimit(`login:${clientIp(req)}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", `Too many attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s).`, requestId, {
      headers: { "retry-after": String(rl.retryAfterSec) },
    });
  }

  const json = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) return FAIL(requestId);

  // Only the configured admin address may even attempt to sign in
  if (parsed.data.email.toLowerCase() !== adminEmail()) {
    log("warn", "admin.login_wrong_email", { requestId });
    return FAIL(requestId);
  }

  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    log("warn", "admin.login_failed", { requestId });
    return FAIL(requestId);
  }

  log("info", "admin.login_ok", { requestId });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store", "x-request-id": requestId } });
}
