import { NextResponse } from "next/server";
import { checkOrigin } from "@/lib/guard";
import { hasAdminSupabase } from "@/lib/supabase/config";
import { sessionClient } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bad = checkOrigin(req, crypto.randomUUID());
  if (bad) return bad;
  if (hasAdminSupabase()) {
    const supabase = await sessionClient();
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
