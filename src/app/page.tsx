import { Desktop } from "@/components/os/Desktop";
import { getSiteProfile } from "@/lib/siteProfileRepo";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { getPublishedReferences } from "@/lib/referencesRepo";
import { getPublicPortfolioContent } from "@/lib/portfolio-content";

// Regenerated at most once a minute, and immediately when the admin saves a change.
export const revalidate = 60;

export default async function Home() {
  const [projects, references, site, portfolioContent] = await Promise.all([getPublishedProjects(), getPublishedReferences(), getSiteProfile(), getPublicPortfolioContent()]);
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: site.role,
    description: site.headline,
    url: site.url,
    sameAs: site.socials.map((s) => s.href),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
      <Desktop projects={projects} references={references} profile={site} journeyPhotos={portfolioContent.journeyPhotos} unavailableDates={portfolioContent.unavailableDates} weeklyUnavailableDays={portfolioContent.weeklyUnavailableDays} monthlyUnavailableDays={portfolioContent.monthlyUnavailableDays} />
    </>
  );
}
