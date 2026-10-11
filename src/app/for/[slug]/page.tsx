import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Desktop } from "@/components/os/Desktop";
import { site } from "@/config/site";
import { getGreeting } from "@/lib/applicationsRepo";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { getPublishedReferences } from "@/lib/referencesRepo";

type Props = { params: Promise<{ slug: string }> };

// Private, per-company link: never cached, never indexed. Unknown links are a plain 404.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${site.name} | ${site.role}`, robots: { index: false, follow: false } };

export default async function ForCompany({ params }: Props) {
  const { slug } = await params;
  const greeting = await getGreeting(slug);
  if (!greeting) notFound();
  const [projects, references] = await Promise.all([getPublishedProjects(), getPublishedReferences()]);
  return <Desktop projects={projects} references={references} greeting={greeting} />;
}
