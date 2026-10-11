import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getPublishedProject } from "@/lib/projectsRepo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const project = await getPublishedProject(slug);
  if (!project) return errorResponse(404, "NOT_FOUND", `No project named "${slug}".`, crypto.randomUUID());
  return NextResponse.json({ data: project }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
