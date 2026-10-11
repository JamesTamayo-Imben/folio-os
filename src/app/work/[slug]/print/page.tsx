import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { coverBackground } from "@/components/os/CoverArt";
import { site } from "@/config/site";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { PrintButton } from "./PrintButton";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getPublishedProjects()).find((x) => x.slug === slug);
  return { title: p ? `${p.title} (case study) | ${site.name}` : "Case study", robots: { index: false, follow: false } };
}

/** A clean, paper-friendly version of a case study for recruiters who need an attachment. */
export default async function PrintCase({ params }: Props) {
  const { slug } = await params;
  const p = (await getPublishedProjects()).find((x) => x.slug === slug);
  if (!p) notFound();

  return (
    <div className="print-root">
      <article className="print-page">
        <div className="print-bar no-print">
          <a href={`/work/${p.slug}`}>Back to the portfolio</a>
          <PrintButton />
        </div>
        <p className="print-eyebrow">{site.name} &middot; {site.role}</p>
        <h1 className="print-title">{p.title}</h1>
        <p className="print-lede">{p.summary}</p>
        <div className="print-cover" style={{ background: coverBackground(p.palette) }}>
          {p.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverUrl} alt={`${p.title} cover`} />
          )}
        </div>
        <dl className="print-facts">
          <div><dt>Role</dt><dd>{p.role || "-"}</dd></div>
          <div><dt>Year</dt><dd>{p.year}</dd></div>
          <div><dt>Discipline</dt><dd>{p.kind}</dd></div>
          <div><dt>Tools</dt><dd>{p.tools.join(", ") || "-"}</dd></div>
        </dl>
        {p.problem && (<><h2>The problem</h2><p>{p.problem}</p></>)}
        {p.process.length > 0 && (
          <>
            <h2>How it came together</h2>
            <ol>
              {p.process.map((s) => (
                <li key={s.title}><strong>{s.title}.</strong> {s.text}</li>
              ))}
            </ol>
          </>
        )}
        {p.images && p.images.length > 0 && (
          <div className="print-gallery">
            {p.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${p.title}, image ${i + 1}`} />
            ))}
          </div>
        )}
        {p.result && (<><h2>The result</h2><p>{p.result}</p></>)}
        <footer className="print-foot">
          <p>{site.name} &middot; {site.email} &middot; {site.url.replace(/^https?:\/\//, "")}/work/{p.slug}</p>
        </footer>
      </article>
    </div>
  );
}
