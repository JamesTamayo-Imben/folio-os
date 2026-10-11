import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", uptimeSec: Math.round(process.uptime()) }, { headers: { "cache-control": "no-store" } });
}
