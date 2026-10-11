"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { initials, site } from "@/config/site";
import { useOs, usePrefs, type AppId } from "@/lib/store";
import { Icon, type IconName } from "./Icon";
import { CoverArt } from "./CoverArt";
import { useProjects } from "./projects-context";

interface Entry {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
}

const PINNED: { app: AppId; label: string; icon: IconName }[] = [
  { app: "hire", label: "Hire me", icon: "briefcase" },
  { app: "work", label: "Work", icon: "folder" },
  { app: "about", label: "About", icon: "user" },
  { app: "mail", label: "Mail", icon: "mail" },
  { app: "terminal", label: "Terminal", icon: "terminal" },
  { app: "personalize", label: "Personalize", icon: "sliders" },
  { app: "reviews", label: "Feedback", icon: "star" },
  { app: "bin", label: "Recycle Bin", icon: "trash" },
];

const GAMES: { app: AppId; label: string; icon: IconName }[] = [
  { app: "snake", label: "Snake", icon: "snake" },
  { app: "g2048", label: "2048", icon: "tiles" },
  { app: "mines", label: "Minesweeper", icon: "flag" },
  { app: "memory", label: "Memory Match", icon: "cards" },
  { app: "ttt", label: "Tic-Tac-Toe", icon: "hash" },
];

export function StartMenu({ effectiveTheme }: { effectiveTheme: "dark" | "light" }) {
  const { open, setStart, setLocked } = useOs();
  const projects = useProjects();
  const setTheme = usePrefs((s) => s.setTheme);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const entries = useMemo<Entry[]>(
    () => [
      ...PINNED.map((p) => ({ key: p.app, label: p.label, hint: "App", icon: p.icon, run: () => open(p.app) })),
      ...GAMES.map((g) => ({ key: g.app, label: g.label, hint: "Game", icon: g.icon, run: () => open(g.app) })),
      ...projects.map((p) => ({ key: p.slug, label: p.title, hint: p.kind, icon: "image" as const, run: () => open("case", p.slug) })),
      { key: "theme", label: `Switch to ${effectiveTheme === "dark" ? "light" : "dark"} theme`, hint: "Action", icon: effectiveTheme === "dark" ? ("sun" as const) : ("moon" as const), run: () => { setTheme(effectiveTheme === "dark" ? "light" : "dark"); setStart(false); } },
    ],
    [open, effectiveTheme, setTheme, setStart, projects],
  );

  const term = q.trim().toLowerCase();
  const results = term ? entries.filter((e) => e.label.toLowerCase().includes(term) || e.hint.toLowerCase().includes(term)) : [];

  return (
    <div id="start-menu" className="start" role="dialog" aria-label="Start menu" onKeyDown={(e) => e.key === "Escape" && setStart(false)}>
      <label className="start-search">
        <Icon name="search" size={18} />
        <span className="sr">Search apps and projects</span>
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps and projects" onKeyDown={(e) => e.key === "Enter" && results[0]?.run()} />
      </label>

      {term ? (
        <ul className="start-results" aria-label="Search results">
          {results.map((r) => (
            <li key={r.key}>
              <button className="row-btn" onClick={r.run}>
                <Icon name={r.icon} size={18} />
                <span>{r.label}</span>
                <span className="dim small">{r.hint}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="dim pad-s">No matches for "{q}". Try a project name or "mail".</li>}
        </ul>
      ) : (
        <>
          <h2 className="start-h">Pinned</h2>
          <ul className="pinned">
            {PINNED.map((p) => (
              <li key={p.app}>
                <button className="pin" onClick={() => open(p.app)}>
                  <span className="pin-icon"><Icon name={p.icon} size={22} /></span>
                  <span>{p.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <h2 className="start-h">Games</h2>
          <ul className="pinned">
            {GAMES.map((g) => (
              <li key={g.app}>
                <button className="pin" onClick={() => open(g.app)}>
                  <span className="pin-icon"><Icon name={g.icon} size={22} /></span>
                  <span>{g.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <h2 className="start-h">Recent work</h2>
          <ul className="recent">
            {projects.map((p) => (
              <li key={p.slug}>
                <button className="row-btn" onClick={() => open("case", p.slug)}>
                  <CoverArt palette={p.palette} shape={p.shape} coverUrl={p.coverUrl} className="recent-thumb" />
                  <span>{p.title}</span>
                  <span className="dim small">{p.kind}, {p.year}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="start-foot">
        <span className="user"><span className="avatar sm" aria-hidden="true">{initials}</span> {site.name}</span>
        <button className="tb-btn" onClick={() => setLocked(true)} aria-label="Lock screen" title="Lock">
          <Icon name="power" size={18} />
        </button>
      </div>
    </div>
  );
}
