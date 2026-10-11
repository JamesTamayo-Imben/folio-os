"use client";
import { useState } from "react";
import { kinds, type Kind } from "@/data/projects";
import { useOs } from "@/lib/store";
import { CoverArt } from "../os/CoverArt";
import { useProjects } from "../os/projects-context";

export function Work() {
  const open = useOs((s) => s.open);
  const projects = useProjects();
  const [kind, setKind] = useState<Kind | "All">("All");
  const list = kind === "All" ? projects : projects.filter((p) => p.kind === kind);

  return (
    <div className="pad">
      <div className="chips" role="group" aria-label="Filter by discipline">
        {(["All", ...kinds] as const).map((k) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k}
          </button>
        ))}
      </div>
      <ul className="grid-cards">
        {list.map((p) => (
          <li key={p.slug}>
            <button className="card" onClick={() => open("case", p.slug)}>
              <CoverArt palette={p.palette} shape={p.shape} coverUrl={p.coverUrl} label={`${p.title} cover`} />
              <span className="card-title">{p.title}</span>
              <span className="card-meta">
                {p.kind}, {p.year}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="dim">{projects.length === 0 ? "No projects have been published yet." : `Nothing filed under ${kind} yet.`}</p>}
    </div>
  );
}
