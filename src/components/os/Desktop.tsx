"use client";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { site, type SiteProfile } from "@/config/site";
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
import { SiteProfileProvider, useSiteProfile } from "./site-profile-context";
import { reorderDesktopIcons, sortDesktopIcons, type DropPosition, type SortDirection } from "./desktop-order";
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

const APP_ORDER_KEY = "folio-os-app-order";
const GAME_ORDER_KEY = "folio-os-game-order";
const UNLOCK_KEY = "folio-os-unlocked";
const CASE_PATH = /^\/work\/([^/]+)/;

function readDesktopOrder(storageKey: string, fallback: string[]) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return fallback;
    const valid = parsed.filter((id) => fallback.includes(id));
    const extras = fallback.filter((id) => !valid.includes(id));
    return [...valid, ...extras];
  } catch {
    return fallback;
  }
}

function moveDesktopIcon(current: string[], from: AppId, to: AppId, position: DropPosition = "before") {
  if (!current.includes(from) || !current.includes(to) || from === to) return current;
  return reorderDesktopIcons(current, from, to, position);
}

export function Desktop({ projects, references = [], greeting = null, initialSlug, profile = site }: { projects: Project[]; references?: Reference[]; greeting?: PublicGreeting | null; initialSlug?: string; profile?: SiteProfile }) {
  const site = profile;
  const { windows, focusedId, startOpen, locked, toasts, open, setStart, setLocked, closeCases } = useOs();
  const { theme, accent, wallpaper, setTheme, setWallpaper } = usePrefs();
  const mobile = useIsMobile();
  const coarse = useIsCoarse();
  const [mounted, setMounted] = useState(false);
  const [systemLight, setSystemLight] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedApp, setDraggedApp] = useState<{ group: "apps" | "games"; app: AppId } | null>(null);
  const dragMovedRef = useRef(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [appOrder, setAppOrder] = useState<string[]>(APP_ICONS.map((i) => i.app));
  const [gameOrder, setGameOrder] = useState<string[]>(GAME_ICONS.map((i) => i.app));

  const effectiveTheme: "dark" | "light" = theme ?? (systemLight ? "light" : "dark");

  useEffect(() => {
    setAppOrder(readDesktopOrder(APP_ORDER_KEY, APP_ICONS.map((i) => i.app)));
    setGameOrder(readDesktopOrder(GAME_ORDER_KEY, GAME_ICONS.map((i) => i.app)));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(APP_ORDER_KEY, JSON.stringify(appOrder));
  }, [appOrder, mounted]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(GAME_ORDER_KEY, JSON.stringify(gameOrder));
  }, [gameOrder, mounted]);

  useEffect(() => {
    if (!draggedApp || !dragPoint) return;
    const onPointerMove = (event: PointerEvent) => {
      setDragPoint({ x: event.clientX, y: event.clientY });
      if (!dragMovedRef.current && dragPoint) {
        const dx = Math.abs(event.clientX - dragPoint.x);
        const dy = Math.abs(event.clientY - dragPoint.y);
        if (dx > 4 || dy > 4) dragMovedRef.current = true;
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".dicon[data-app]");
      if (target) {
        const targetApp = target.dataset.app as AppId | undefined;
        const targetGroup = target.dataset.group as "apps" | "games" | undefined;
        if (targetApp && targetGroup && targetApp !== draggedApp.app) {
          const rect = target.getBoundingClientRect();
          const position: DropPosition = event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
          moveIcon(draggedApp.group, draggedApp.app, targetGroup, targetApp, position);
        }
      }
      setDraggedApp(null);
      setDragPoint(null);
      dragMovedRef.current = false;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggedApp, dragPoint]);

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

  const applySort = (mode: SortDirection | "default") => {
    const appBase = APP_ICONS.map((item) => item.app);
    const gameBase = GAME_ICONS.map((item) => item.app);

    setAppOrder((current) => mode === "default" ? appBase : sortDesktopIcons(current, mode));
    setGameOrder((current) => mode === "default" ? gameBase : sortDesktopIcons(current, mode));
  };

  const moveIcon = (fromGroup: "apps" | "games", dragId: AppId, targetGroup: "apps" | "games", targetId: AppId, position: DropPosition = "before") => {
    if (fromGroup === targetGroup) {
      if (fromGroup === "apps") {
        setAppOrder((current) => moveDesktopIcon(current, dragId, targetId, position));
      } else {
        setGameOrder((current) => moveDesktopIcon(current, dragId, targetId, position));
      }
      return;
    }

    if (fromGroup === "apps") {
      setAppOrder((current) => current.filter((id) => id !== dragId));
      setGameOrder((current) => {
        const next = [...current];
        const index = next.indexOf(targetId);
        const targetIndex = position === "after" ? index + 1 : index;
        if (index === -1) return [...next, dragId];
        return [...next.slice(0, Math.max(0, targetIndex)), dragId, ...next.slice(Math.max(0, targetIndex))];
      });
      return;
    }

    setGameOrder((current) => current.filter((id) => id !== dragId));
    setAppOrder((current) => {
      const next = [...current];
      const index = next.indexOf(targetId);
      const targetIndex = position === "after" ? index + 1 : index;
      if (index === -1) return [...next, dragId];
      return [...next.slice(0, Math.max(0, targetIndex)), dragId, ...next.slice(Math.max(0, targetIndex))];
    });
  };

  const menuItems: MenuItem[] = [
    { label: "Next wallpaper", run: nextWallpaper },
    { label: "Sort: A–Z", run: () => applySort("asc") },
    { label: "Sort: Z–A", run: () => applySort("desc") },
    { label: "Reset desktop order", run: () => applySort("default") },
    { label: "Personalize", run: () => open("personalize") },
    { label: effectiveTheme === "dark" ? "Switch to light theme" : "Switch to dark theme", run: () => setTheme(effectiveTheme === "dark" ? "light" : "dark") },
    { label: "Open terminal", run: () => open("terminal") },
    { label: `About ${site.osName}`, run: () => open("about") },
  ];

  const onIconClick = (e: React.MouseEvent, app: AppId) => {
    setSelected(app);
    if (coarse || e.detail >= 2) open(app);
  };

  const renderIcons = (group: "apps" | "games", list: DIcon[]) => {
    const order = group === "apps" ? appOrder : gameOrder;

    return order.map((appId) => {
      const item = list.find((i) => i.app === appId);
      if (!item) return null;
      return (
        <button
          key={item.app}
          className={`dicon ${selected === item.app ? "dicon-sel" : ""} ${draggedApp?.app === item.app ? "dicon-dragging" : ""}`}
          data-app={item.app}
          data-group={group}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            dragMovedRef.current = false;
            setDraggedApp({ group, app: item.app });
            setDragPoint({ x: e.clientX, y: e.clientY });
            setSelected(item.app);
          }}
          onClick={(e) => {
            if (dragMovedRef.current) {
              e.preventDefault();
              e.stopPropagation();
              dragMovedRef.current = false;
              return;
            }
            onIconClick(e, item.app);
          }}
          onKeyDown={(e) => e.key === "Enter" && open(item.app)}
          aria-label={`${item.label}${coarse ? "" : ", double-click to open"}`}>
          <span className="dicon-art"><Icon name={item.icon} size={28} /></span>
          <span className="dicon-label">{item.label}</span>
        </button>
      );
    });
  };

  return (
    <SiteProfileProvider profile={profile}>
    <ProjectsProvider projects={projects} references={references}>
      <div className="desktop" onContextMenu={(e) => { if (!(e.target as HTMLElement).closest(".win, .taskbar, .start")) { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); } }} onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".dicon")) setSelected(null); }}>
        <Wallpaper mounted={mounted} />

        <main className="icons" aria-label="Desktop">
          <h1 className="sr">{site.name}, {site.role}</h1>
          <div className="icon-group" role="group" aria-label="Apps">{renderIcons("apps", APP_ICONS)}</div>
          <div className="icon-group" role="group" aria-label="Games">{renderIcons("games", GAME_ICONS)}</div>
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
    </SiteProfileProvider>
  );
}

