import { NextResponse } from "next/server";
import { guardAdmin, isResponse } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId);
  if (isResponse(admin)) return admin;
  return NextResponse.json({ admin: true, email: admin.email }, { headers: { "cache-control": "no-store" } });
}
