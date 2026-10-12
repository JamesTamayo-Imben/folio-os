import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Desktop } from "@/components/os/Desktop";
import { getSiteProfile } from "@/lib/siteProfileRepo";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { getPublishedReferences } from "@/lib/referencesRepo";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getPublishedProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [projects, site] = await Promise.all([getPublishedProjects(), getSiteProfile()]);
  const p = projects.find((x) => x.slug === slug);
  if (!p) return {};
  return {
    title: `${p.title} | ${site.name}`,
    description: p.summary,
    openGraph: { title: `${p.title} | ${site.name}`, description: p.summary, type: "article" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const [projects, references, profile] = await Promise.all([getPublishedProjects(), getPublishedReferences(), getSiteProfile()]);
  if (!projects.some((p) => p.slug === slug)) notFound();
  return <Desktop projects={projects} references={references} initialSlug={slug} profile={profile} />;
}
