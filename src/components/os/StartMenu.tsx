"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSiteProfile, profileInitials } from "./site-profile-context";
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
  { app: "notepad", label: "Notepad", icon: "notepad" },
  { app: "draw", label: "Draw", icon: "edit" },
  { app: "gallery", label: "Gallery", icon: "image" },
  { app: "calendar", label: "Calendar", icon: "calendar" },
  { app: "calculator", label: "Calculator", icon: "calculator" },
  { app: "camera", label: "Camera", icon: "camera" },
];

const GAMES: { app: AppId; label: string; icon: IconName }[] = [
  { app: "snake", label: "Snake", icon: "snake" },
  { app: "g2048", label: "2048", icon: "tiles" },
  { app: "mines", label: "Minesweeper", icon: "flag" },
  { app: "memory", label: "Memory Match", icon: "cards" },
  { app: "ttt", label: "Tic-Tac-Toe", icon: "hash" },
];

export function StartMenu({ effectiveTheme }: { effectiveTheme: "dark" | "light" }) {
  const site = useSiteProfile();
  const { open, setStart, setLocked } = useOs();
  const projects = useProjects();
  const setTheme = usePrefs((s) => s.setTheme);
  const [q, setQ] = useState("");
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reset" | "sleep" | "restart" | "poweroff" | null>(null);
  const [poweredOff, setPoweredOff] = useState(false);
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

  const performAction = () => {
    if (!confirmAction) return;
    if (confirmAction === "sleep") {
      setConfirmAction(null);
      setPowerMenuOpen(false);
      setLocked(true);
      return;
    }
    if (confirmAction === "restart") {
      window.location.reload();
      return;
    }
    if (confirmAction === "reset") {
      const keys = [
        "folio-os-prefs", "folio-os-scores", "folio-os-app-order", "folio-os-game-order",
        "folio-os-icon-positions", "folio-os-local-desktop-items", "folio-os-notes-v1",
        "folio-os-drawings-v1", "folio-os-journey-gallery-v1", "folio-os-camera-roll-v1",
        "folio-os-camera-my-pictures-v1", "folio-os-unlocked", "folio-os-tip",
      ];
      keys.forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem("folio-os-unlocked");
      window.location.reload();
      return;
    }

    setConfirmAction(null);
    setPowerMenuOpen(false);
    setStart(false);
    window.close();
    setPoweredOff(true);
  };

  if (poweredOff) {
    return createPortal(<div className="poweroff-screen" role="status"><span className="poweroff-mark"><Icon name="power" size={28} /></span><h1>FolioOS is off</h1><p>Your browser prevented this page from closing. You can close this tab now.</p><button className="btn btn-quiet" onClick={() => setPoweredOff(false)}>Turn FolioOS back on</button></div>, document.body);
  }

  return (
    <>
    <div id="start-menu" className={`start ${confirmAction ? "start-power-confirming" : ""}`} role="dialog" aria-label="Start menu" onKeyDown={(e) => { if (e.key === "Escape") { if (confirmAction) setConfirmAction(null); else if (powerMenuOpen) setPowerMenuOpen(false); else setStart(false); } }}>
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
        <span className="user">
          {site.profileImageUrl ? (
            <img className="avatar sm" src={site.profileImageUrl} alt="Profile" style={{ objectFit: "cover" }} />
          ) : (
            <span className="avatar sm" aria-hidden="true">{profileInitials(site.name)}</span>
          )}
          {site.name}
        </span>
        <div className="start-power-wrap">
        {powerMenuOpen && <div className="start-power-menu" role="menu" aria-label="Power options">
          <button role="menuitem" onClick={() => setConfirmAction("reset")}><Icon name="sliders" size={17} /><span><strong>Reset OS</strong><small>Remove local app data and settings</small></span></button>
          <button role="menuitem" onClick={() => setConfirmAction("sleep")}><Icon name="lock" size={17} /><span><strong>Sleep</strong><small>Lock this desktop</small></span></button>
          <button role="menuitem" onClick={() => setConfirmAction("restart")}><Icon name="restore" size={17} /><span><strong>Restart</strong><small>Reload this page</small></span></button>
          <button role="menuitem" className="poweroff-option" onClick={() => setConfirmAction("poweroff")}><Icon name="power" size={17} /><span><strong>Power off</strong><small>Close this browser tab</small></span></button>
        </div>}
        <button className={`tb-btn ${powerMenuOpen ? "tb-active" : ""}`} onClick={() => setPowerMenuOpen((value) => !value)} aria-label="Power options" title="Power" aria-expanded={powerMenuOpen}>
          <Icon name="power" size={18} />
        </button>
        </div>
      </div>
    </div>
      {confirmAction && createPortal(<div className="power-confirm-overlay" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setConfirmAction(null); }}>
        <section className="power-confirm" role="alertdialog" aria-modal="true" aria-labelledby="power-confirm-title" aria-describedby="power-confirm-description">
          <span className="power-confirm-icon"><Icon name={confirmAction === "sleep" ? "lock" : confirmAction === "restart" ? "restore" : confirmAction === "reset" ? "sliders" : "power"} size={22} /></span>
          <h2 id="power-confirm-title">{confirmAction === "reset" ? "Reset FolioOS?" : confirmAction === "sleep" ? "Put FolioOS to sleep?" : confirmAction === "restart" ? "Restart FolioOS?" : "Power off FolioOS?"}</h2>
          <p id="power-confirm-description">{confirmAction === "reset" ? "This clears local notes, drawings, photos, desktop layout, game scores, and preferences from this browser. Your admin profile and published portfolio data are not changed." : confirmAction === "sleep" ? "The desktop will lock. You can unlock it again from the lock screen." : confirmAction === "restart" ? "This reloads the page. Data saved locally or to your account will remain." : "FolioOS will try to close this tab. Your browser may require you to close it manually."}</p>
          <footer><button className="btn btn-quiet" onClick={() => setConfirmAction(null)}>Cancel</button><button className={`btn ${confirmAction === "reset" || confirmAction === "poweroff" ? "btn-danger" : ""}`} onClick={performAction}>{confirmAction === "reset" ? "Reset OS" : confirmAction === "sleep" ? "Sleep" : confirmAction === "restart" ? "Restart" : "Power off"}</button></footer>
        </section>
      </div>, document.body)}
    </>
  );
}
