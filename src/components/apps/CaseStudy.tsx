"use client";
import { useOs } from "@/lib/store";
import { CoverArt } from "../os/CoverArt";
import { Icon } from "../os/Icon";
import { useProjects } from "../os/projects-context";
import { CommentsPanel } from "./CommentsPanel";

export function CaseStudy({ slug }: { slug: string }) {
  const open = useOs((s) => s.open);
  const projects = useProjects();
  const p = projects.find((x) => x.slug === slug);
  if (!p) return <div className="pad"><p>This project could not be found. It may have been unpublished.</p></div>;
  const next = projects[(projects.findIndex((x) => x.slug === slug) + 1) % projects.length];

  return (
    <article className="case">
      <CoverArt palette={p.palette} shape={p.shape} coverUrl={p.coverUrl} label={`${p.title} cover`} className="case-hero" />
      <div className="pad case-body">
        <h1 className="case-title">{p.title}</h1>
        <p className="lede">{p.summary}</p>
        <p className="case-tools">
          <a className="btn btn-quiet btn-sm" href={`/work/${p.slug}/print`} target="_blank" rel="noopener noreferrer">
            <Icon name="download" size={14} /> Save as PDF<span className="sr"> (opens a printable version in a new tab)</span>
          </a>
        </p>
        <dl className="facts">
          <div><dt>Role</dt><dd>{p.role || "-"}</dd></div>
          <div><dt>Year</dt><dd>{p.year}</dd></div>
          <div><dt>Discipline</dt><dd>{p.kind}</dd></div>
          <div><dt>Tools</dt><dd>{p.tools.length ? p.tools.join(", ") : "-"}</dd></div>
        </dl>
        {p.problem && (<><h2>The problem</h2><p>{p.problem}</p></>)}
        {p.process.length > 0 && (
          <>
            <h2>How it came together</h2>
            <ol className="steps">
              {p.process.map((s) => (
                <li key={s.title}>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </>
        )}
        {p.images && p.images.length > 0 && (
          <>
            <h2>Gallery</h2>
            <ul className="gallery">
              {p.images.map((src, i) => (
                <li key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${p.title}, image ${i + 1}`} loading="lazy" decoding="async" />
                </li>
              ))}
            </ul>
          </>
        )}
        {p.result && (<><h2>The result</h2><p>{p.result}</p></>)}

        <CommentsPanel project={p.slug} />

        {next && next.slug !== p.slug && (
          <button className="btn btn-quiet" onClick={() => open("case", next.slug)}>
            Next project: {next.title} <Icon name="arrow" size={16} />
          </button>
        )}
      </div>
    </article>
  );
}
