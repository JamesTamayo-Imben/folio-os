"use client";
import { site } from "@/config/site";
import { track } from "@/lib/track";
import { useOs } from "@/lib/store";
import { Icon } from "../os/Icon";
import { useProjects } from "../os/projects-context";
import { CoverArt } from "../os/CoverArt";
import { ReferencesList } from "./ReferencesList";

/** The recruiter fast lane: everything a busy person needs on one screen. */
export function Hire() {
  const open = useOs((s) => s.open);
  const projects = useProjects();
  const featured = [projects.find((p) => p.slug === site.featuredSlug), ...projects.filter((p) => p.slug !== site.featuredSlug)].filter(Boolean).slice(0, 3) as typeof projects;

  return (
    <div className="pad hire">
      <p className="eyebrow">{site.name} &middot; {site.role}</p>
      <h1 className="hire-headline">{site.headline}</h1>
      <p className="status"><span className="dot" aria-hidden="true" /> {site.availability}</p>

      <ul className="tags" aria-label="Strengths">
        {site.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      <div className="row">
        <a className="btn" href={site.resumeUrl} download onClick={() => track("resume_download")}>
          <Icon name="download" size={16} /> Download résumé
        </a>
        <a className="btn btn-quiet" href={`mailto:${site.email}`}>
          <Icon name="mail" size={16} /> {site.email}
        </a>
        <a className="btn btn-quiet" href={site.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn <Icon name="external" size={14} />
          <span className="sr">(opens in a new tab)</span>
        </a>
      </div>

      {featured.length > 0 && (
        <>
          <h2>Selected work</h2>
          <ul className="hire-work">
            {featured.map((p) => (
              <li key={p.slug}>
                <button className="card" onClick={() => open("case", p.slug)}>
                  <CoverArt palette={p.palette} shape={p.shape} coverUrl={p.coverUrl} label={`${p.title} cover`} />
                  <span className="card-title">{p.title}</span>
                  <span className="card-meta">{p.kind}, {p.year}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <ReferencesList />

      <div className="row">
        <button className="btn btn-quiet" onClick={() => open("work")}>See all work</button>
        <button className="btn btn-quiet" onClick={() => open("mail")}>Send a message</button>
      </div>
    </div>
  );
}
