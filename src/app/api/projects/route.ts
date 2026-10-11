import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { projectsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const parsed = projectsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_FAILED", "Check the query parameters.", requestId, { fields: parsed.error.flatten().fieldErrors });
  }
  const { kind, page, limit } = parsed.data;
  const all = await getPublishedProjects();
  const filtered = kind ? all.filter((p) => p.kind === kind) : all;
  return NextResponse.json(
    { data: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
