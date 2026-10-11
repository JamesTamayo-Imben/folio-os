"use client";
import { initials, site } from "@/config/site";
import { track } from "@/lib/track";
import { Icon } from "../os/Icon";
import { ReferencesList } from "./ReferencesList";

export function About() {
  return (
    <div className="pad about">
      <div className="about-head">
        <div className="avatar" aria-hidden="true">{initials}</div>
        <div>
          <h1 className="about-name">{site.name}</h1>
          <p className="dim">{site.role}, {site.location}</p>
        </div>
      </div>
      {site.bio.map((b) => (
        <p key={b}>{b}</p>
      ))}
      <h2>What I do</h2>
      <ul className="tags">
        {site.skills.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h2>Tools</h2>
      <ul className="tags">
        {site.tools.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <ReferencesList />
      <p className="status"><span className="dot" aria-hidden="true" /> {site.availability}</p>
      <div className="row">
        <a className="btn" href={site.resumeUrl} download onClick={() => track("resume_download")}>
          <Icon name="download" size={16} /> Download resume
        </a>
        {site.socials.map((s) => (
          <a key={s.label} className="btn btn-quiet" href={s.href} target="_blank" rel="noopener noreferrer">
            {s.label} <Icon name="external" size={14} />
            <span className="sr">(opens in a new tab)</span>
          </a>
        ))}
      </div>
    </div>
  );
}
