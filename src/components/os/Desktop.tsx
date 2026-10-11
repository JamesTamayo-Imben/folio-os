"use client";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { site } from "@/config/site";
import type { Project } from "@/data/projects";
import type { PublicGreeting } from "@/lib/applicationsRepo";
import type { Reference } from "@/lib/referencesRepo";
import { referrerHost, track } from "@/lib/track";
import { AppBody } from "../apps/AppBody";
import { useOs, usePrefs, type AppId } from "@/lib/store";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { useIsCoarse, useIsMobile } from "./hooks";
import { Icon, type IconName } from "./Icon";
import { LockScreen } from "./LockScreen";
import { ProjectsProvider } from "./projects-context";
import { StartMenu } from "./StartMenu";
import { Taskbar } from "./Taskbar";
import { Wallpaper } from "./Wallpaper";
import { WindowFrame } from "./Window";

type DIcon = { app: AppId; label: string; icon: IconName };

const APP_ICONS: DIcon[] = [
  { app: "hire", label: "Hire me", icon: "briefcase" },
  { app: "work", label: "Work", icon: "folder" },
  { app: "about", label: "About", icon: "user" },
  { app: "reviews", label: "Feedback", icon: "star" },
  { app: "mail", label: "Mail", icon: "mail" },
  { app: "terminal", label: "Terminal", icon: "terminal" },
  { app: "bin", label: "Recycle Bin", icon: "trash" },
];

const GAME_ICONS: DIcon[] = [
  { app: "snake", label: "Snake", icon: "snake" },
  { app: "g2048", label: "2048", icon: "tiles" },
  { app: "mines", label: "Minesweeper", icon: "flag" },
  { app: "memory", label: "Memory Match", icon: "cards" },
  { app: "ttt", label: "Tic-Tac-Toe", icon: "hash" },
];

const UNLOCK_KEY = "folio-os-unlocked";
const CASE_PATH = /^\/work\/([^/]+)/;

export function Desktop({ projects, references = [], greeting = null, initialSlug }: { projects: Project[]; references?: Reference[]; greeting?: PublicGreeting | null; initialSlug?: string }) {
  const { windows, focusedId, startOpen, locked, toasts, open, setStart, setLocked, closeCases } = useOs();
  const { theme, accent, wallpaper, setTheme, setWallpaper } = usePrefs();
  const mobile = useIsMobile();
  const coarse = useIsCoarse();
  const [mounted, setMounted] = useState(false);
  const [systemLight, setSystemLight] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const effectiveTheme: "dark" | "light" = theme ?? (systemLight ? "light" : "dark");

  /* First load: deep links skip the lock screen; otherwise show it once per session. */
  useEffect(() => {
    setMounted(true);
    setSystemLight(window.matchMedia("(prefers-color-scheme: light)").matches);
    let seen = false;
    try {
      seen = sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch {
      /* storage can be blocked; show the lock screen */
    }
    const once = (key: string, fn: () => void) => {
      try {
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");
      } catch {
        /* storage blocked: count it anyway */
      }
      fn();
    };
    once("folio-os-viewed", () => track("view", { referrer: referrerHost() }));
    if (greeting) once(`folio-os-app-${greeting.slug}`, () => track("application_view", { application: greeting.slug }));

    if (initialSlug) {
      setLocked(false);
      open("case", initialSlug);
    } else if (seen) {
      setLocked(false);
    } else {
      setLocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.style.setProperty("--accent", accent);
  }, [effectiveTheme, accent]);

  const enter = useCallback(
    (hire = false) => {
      try {
        sessionStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        /* ignore */
      }
      setLocked(false);
      const wanted = greeting?.featuredSlug ?? site.featuredSlug;
      const featured = projects.find((p) => p.slug === wanted) ?? projects[0];
      if (useOs.getState().windows.length === 0) {
        if (hire) setTimeout(() => open("hire"), 450);
        else if (featured) setTimeout(() => open("case", featured.slug), 450);
      }
      // One-time tip so first-time visitors know how this interface works
      try {
        if (!localStorage.getItem("folio-os-tip")) {
          localStorage.setItem("folio-os-tip", "1");
          setTimeout(() => useOs.getState().notify(coarse ? "Tip: tap an icon to open it. Tap Hire me for the quick version." : "Tip: double-click an icon to open it. Ctrl+K searches everything."), 1400);
        }
      } catch {
        /* ignore */
      }
    },
    [open, setLocked, projects, greeting, coarse],
  );

  /* URL sync: the focused case study owns the address bar, so every project is shareable. */
  const focusedWin = windows.find((w) => w.id === focusedId && !w.minimized);
  const caseSlug = focusedWin?.app === "case" ? focusedWin.param : undefined;
  useEffect(() => {
    if (!mounted) return;
    const path = caseSlug ? `/work/${caseSlug}` : "/";
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    document.title = caseSlug ? `${projects.find((p) => p.slug === caseSlug)?.title ?? "Work"} | ${site.name}` : `${site.name} | ${site.role}`;
  }, [caseSlug, mounted, projects]);

  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(CASE_PATH);
      if (m) open("case", m[1]);
      else closeCases();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, closeCases]);

  /* Ctrl/Cmd+K opens search. Ctrl+Shift+A is the keyboard route to the admin login. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setStart(!useOs.getState().startOpen);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        window.location.assign("/admin/login");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setStart]);

  const nextWallpaper = () => {
    const ids = ["default", ...projects.map((p) => p.slug)];
    setWallpaper(ids[(ids.indexOf(wallpaper) + 1) % ids.length] ?? "default");
  };

  const menuItems: MenuItem[] = [
    { label: "Next wallpaper", run: nextWallpaper },
    { label: "Personalize", run: () => open("personalize") },
    { label: effectiveTheme === "dark" ? "Switch to light theme" : "Switch to dark theme", run: () => setTheme(effectiveTheme === "dark" ? "light" : "dark") },
    { label: "Open terminal", run: () => open("terminal") },
    { label: `About ${site.osName}`, run: () => open("about") },
  ];

  const onIconClick = (e: React.MouseEvent, app: AppId) => {
    setSelected(app);
    if (coarse || e.detail >= 2) open(app);
  };

  const renderIcons = (list: DIcon[]) =>
    list.map((i) => (
      <button key={i.app} className={`dicon ${selected === i.app ? "dicon-sel" : ""}`} onClick={(e) => onIconClick(e, i.app)} onKeyDown={(e) => e.key === "Enter" && open(i.app)} aria-label={`${i.label}${coarse ? "" : ", double-click to open"}`}>
        <span className="dicon-art"><Icon name={i.icon} size={28} /></span>
        <span className="dicon-label">{i.label}</span>
      </button>
    ));

  return (
    <ProjectsProvider projects={projects} references={references}>
      <div className="desktop" onContextMenu={(e) => { if (!(e.target as HTMLElement).closest(".win, .taskbar, .start")) { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); } }} onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".dicon")) setSelected(null); }}>
        <Wallpaper mounted={mounted} />

        <main className="icons" aria-label="Desktop">
          <h1 className="sr">{site.name}, {site.role}</h1>
          <div className="icon-group" role="group" aria-label="Apps">{renderIcons(APP_ICONS)}</div>
          <div className="icon-group" role="group" aria-label="Games">{renderIcons(GAME_ICONS)}</div>
        </main>

        <div className="windows">
          <AnimatePresence>
            {windows.map((w) => (
              <WindowFrame key={w.id} win={w} mobile={mobile}>
                <AppBody win={w} />
              </WindowFrame>
            ))}
          </AnimatePresence>
        </div>

        {startOpen && <div className="scrim" onPointerDown={() => setStart(false)} aria-hidden="true" />}
        {startOpen && <StartMenu effectiveTheme={effectiveTheme} />}
        <Taskbar effectiveTheme={effectiveTheme} />

        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="toast">{t.text}</div>
          ))}
        </div>

        {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}

        <AnimatePresence>{locked && <LockScreen onEnter={enter} greeting={greeting} />}</AnimatePresence>
      </div>
    </ProjectsProvider>
  );
}

