import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { projects as seed } from "@/data/projects";
import { guardAdmin, isResponse } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { inputToRow } from "@/lib/projectsRepo";
import { serviceClient } from "@/lib/supabase/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Loads the four sample projects so a fresh database is not empty. Existing slugs are left untouched. */
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;

  const rows = seed.map((p, i) =>
    inputToRow({ ...p, coverUrl: null, images: [], published: true, sortOrder: i, palette: p.palette, kind: p.kind }),
  );
  const { error } = await serviceClient().from("projects").upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) return errorResponse(500, "INTERNAL", "Could not load the samples.", requestId);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, count: rows.length });
}
