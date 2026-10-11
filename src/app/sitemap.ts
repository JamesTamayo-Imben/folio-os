import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getPublishedProjects } from "@/lib/projectsRepo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getPublishedProjects();
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    ...projects.map((p) => ({ url: `${site.url}/work/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
