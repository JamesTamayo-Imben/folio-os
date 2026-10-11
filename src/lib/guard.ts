import { errorResponse } from "./http";
import { getAdmin, type Admin } from "./auth";
import { hasAdminSupabase } from "./supabase/config";
import { log } from "./logger";

/** Rejects cross-site requests. Browsers always send Origin on cross-site POST/PUT/DELETE. */
export function checkOrigin(req: Request, requestId: string) {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    /* falls through to rejection */
  }
  if (!host || originHost !== host) {
    log("warn", "request.bad_origin", { requestId });
    return errorResponse(403, "FORBIDDEN_ORIGIN", "This request came from an unexpected site.", requestId);
  }
  return null;
}

export function requireJson(req: Request, requestId: string) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request as JSON.", requestId);
  }
  return null;
}

export const NOT_CONFIGURED = (requestId: string) =>
  errorResponse(503, "NOT_CONFIGURED", "Supabase is not configured. Set the environment variables in .env.local.", requestId);

/**
 * Guard for every admin API route: origin check for writes, config check, then admin check.
 * Returns either an error Response or the verified admin.
 */
export async function guardAdmin(req: Request, requestId: string, opts: { write?: boolean } = {}): Promise<Response | Admin> {
  if (opts.write) {
    const bad = checkOrigin(req, requestId);
    if (bad) return bad;
  }
  if (!hasAdminSupabase()) return NOT_CONFIGURED(requestId);
  const admin = await getAdmin();
  if (!admin) return errorResponse(401, "UNAUTHORIZED", "Sign in as admin to continue.", requestId);
  return admin;
}

export const isResponse = (v: Response | Admin): v is Response => v instanceof Response;
