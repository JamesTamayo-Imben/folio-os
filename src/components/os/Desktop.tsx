"use client";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { site, type SiteProfile } from "@/config/site";
import type { Project } from "@/data/projects";
import type { PublicGreeting } from "@/lib/applicationsRepo";
import type { Reference } from "@/lib/referencesRepo";
import { referrerHost, track } from "@/lib/track";
import { AppBody } from "../apps/AppBody";
import { APP_META, useOs, usePrefs, type AppId } from "@/lib/store";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { useIsCoarse, useIsMobile } from "./hooks";
import { Icon, type IconName } from "./Icon";
import { LockScreen } from "./LockScreen";
import { ProjectsProvider } from "./projects-context";
import { SiteProfileProvider, useSiteProfile } from "./site-profile-context";
import { sortDesktopIcons, sortDesktopIconsBySize, type SortMode } from "./desktop-order";
import { StartMenu } from "./StartMenu";
import { Taskbar } from "./Taskbar";
import { Wallpaper } from "./Wallpaper";
import { WindowFrame } from "./Window";

type DIcon = { app: string; label: string; icon: IconName; localItem?: LocalDesktopItem };
type LocalDesktopItem = { id: string; kind: "file" | "folder" | "shortcut"; name: string; parentId: string | null; content?: string; target?: string };

const APP_ICONS: DIcon[] = [
  { app: "hire", label: "Hire me", icon: "briefcase" },
  { app: "work", label: "Work", icon: "folder" },
  { app: "about", label: "About", icon: "user" },
  { app: "reviews", label: "Feedback", icon: "star" },
  { app: "mail", label: "Mail", icon: "mail" },
  { app: "terminal", label: "Terminal", icon: "terminal" },
  { app: "games", label: "Games", icon: "gamepad" },
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
const ICON_POSITIONS_KEY = "folio-os-icon-positions";
const LOCAL_ITEMS_KEY = "folio-os-local-desktop-items";
const UNLOCK_KEY = "folio-os-unlocked";
const CASE_PATH = /^\/work\/([^/]+)/;
const ICON_COLUMN_PITCH = 98;
const ICON_ROW_PITCH = 106;
type IconPosition = { x: number; y: number };

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

export function Desktop({ projects, references = [], greeting = null, initialSlug, profile = site }: { projects: Project[]; references?: Reference[]; greeting?: PublicGreeting | null; initialSlug?: string; profile?: SiteProfile }) {
  const site = profile;
  const { windows, focusedId, startOpen, locked, toasts, open, setStart, setLocked, closeCases } = useOs();
  const { theme, accent, wallpaper, setTheme, setWallpaper } = usePrefs();
  const mobile = useIsMobile();
  const coarse = useIsCoarse();
  const [mounted, setMounted] = useState(false);
  const [systemLight, setSystemLight] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; parentId: string | null; itemId: string | null } | null>(null);
  const [draggedApp, setDraggedApp] = useState<{ group: "apps" | "games"; app: string } | null>(null);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef<IconPosition>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<IconPosition>({ x: 0, y: 0 });
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [appOrder, setAppOrder] = useState<string[]>(APP_ICONS.map((i) => i.app));
  const [gameOrder, setGameOrder] = useState<string[]>(GAME_ICONS.map((i) => i.app));
  const [iconPositions, setIconPositions] = useState<Record<string, IconPosition>>({});
  const [localItems, setLocalItems] = useState<LocalDesktopItem[]>([]);
  const [localDialog, setLocalDialog] = useState<{ kind: "file" | "folder"; id: string } | null>(null);
  const [fileDraft, setFileDraft] = useState("");

  const effectiveTheme: "dark" | "light" = theme ?? (systemLight ? "light" : "dark");

  useEffect(() => {
    setAppOrder(readDesktopOrder(APP_ORDER_KEY, APP_ICONS.map((i) => i.app)));
    setGameOrder(readDesktopOrder(GAME_ORDER_KEY, GAME_ICONS.map((i) => i.app)));
    try {
      const localRaw = window.localStorage.getItem(LOCAL_ITEMS_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw) as LocalDesktopItem[];
        if (Array.isArray(parsed)) {
          setLocalItems(parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && ["file", "folder", "shortcut"].includes(item.kind)));
        }
      }
      const raw = window.localStorage.getItem(ICON_POSITIONS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, IconPosition>;
        const positions: Record<string, IconPosition> = {};
        for (const [app, position] of Object.entries(saved)) {
          if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
            positions[app] = {
              x: Math.max(0, Math.round(position.x / ICON_COLUMN_PITCH) * ICON_COLUMN_PITCH),
              y: Math.max(0, Math.round(position.y / ICON_ROW_PITCH) * ICON_ROW_PITCH),
            };
          }
        }
        setIconPositions(positions);
      }
    } catch {
      /* Invalid or unavailable local storage: use the default icon layout. */
    }
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
    if (!mounted) return;
    try {
      window.localStorage.setItem(ICON_POSITIONS_KEY, JSON.stringify(iconPositions));
    } catch {
      /* Ignore unavailable local storage. */
    }
  }, [iconPositions, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(localItems));
    } catch {
      /* Ignore unavailable local storage. */
    }
  }, [localItems, mounted]);

  useEffect(() => {
    if (!draggedApp) return;
    const onPointerMove = (event: PointerEvent) => {
      setDragPoint({ x: event.clientX, y: event.clientY });
      if (!dragMovedRef.current) {
        const dx = Math.abs(event.clientX - dragStartRef.current.x);
        const dy = Math.abs(event.clientY - dragStartRef.current.y);
        if (dx > 4 || dy > 4) dragMovedRef.current = true;
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (dragMovedRef.current) {
        const stage = document.querySelector<HTMLElement>(`.icon-group[data-icon-group="${draggedApp.group}"]`);
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const maxColumn = Math.max(0, Math.floor((rect.width - 88) / ICON_COLUMN_PITCH));
          const maxRow = Math.max(0, Math.floor((rect.height - 96) / ICON_ROW_PITCH));
          const desiredColumn = Math.max(0, Math.min(maxColumn, Math.round((event.clientX - rect.left - dragOffsetRef.current.x) / ICON_COLUMN_PITCH)));
          const desiredRow = Math.max(0, Math.min(maxRow, Math.round((event.clientY - rect.top - dragOffsetRef.current.y) / ICON_ROW_PITCH)));
          const occupied = new Set<string>();

          stage.querySelectorAll<HTMLButtonElement>(".dicon[data-icon-id]").forEach((icon) => {
            if (icon.dataset.iconId === draggedApp.app) return;
            const iconRect = icon.getBoundingClientRect();
            const column = Math.max(0, Math.min(maxColumn, Math.round((iconRect.left - rect.left) / ICON_COLUMN_PITCH)));
            const row = Math.max(0, Math.min(maxRow, Math.round((iconRect.top - rect.top) / ICON_ROW_PITCH)));
            occupied.add(`${column}:${row}`);
          });

          let nearest: { column: number; row: number; distance: number } | null = null;
          for (let row = 0; row <= maxRow; row += 1) {
            for (let column = 0; column <= maxColumn; column += 1) {
              if (occupied.has(`${column}:${row}`)) continue;
              const distance = (column - desiredColumn) ** 2 + (row - desiredRow) ** 2;
              if (!nearest || distance < nearest.distance) nearest = { column, row, distance };
            }
          }

          if (nearest) {
            setIconPositions((current) => ({
              ...current,
              [draggedApp.app]: { x: nearest.column * ICON_COLUMN_PITCH, y: nearest.row * ICON_ROW_PITCH },
            }));
          }
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
  }, [draggedApp]);

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

  const uploadWallpaper = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      useOs.getState().notify("Choose an image file for the wallpaper.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      useOs.getState().notify("Wallpaper images must be smaller than 12 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / bitmap.width, 1080 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setWallpaper(`image:${canvas.toDataURL("image/jpeg", 0.82)}`);
      useOs.getState().notify("Wallpaper uploaded and saved on this device.");
    } catch {
      useOs.getState().notify("This image could not be used as a wallpaper.");
    }
  };

  const createLocalItem = (kind: LocalDesktopItem["kind"], parentId: string | null = null) => {
    const name = window.prompt(`Name for new ${kind}:`)?.trim();
    if (!name) return;
    if (localItems.some((item) => item.parentId === parentId && item.name.toLowerCase() === name.toLowerCase())) {
      useOs.getState().notify("An item with that name already exists here.");
      return;
    }

    const item: LocalDesktopItem = { id: window.crypto.randomUUID(), kind, name, parentId };
    if (kind === "file") {
      const content = window.prompt("Text file contents:", "");
      if (content === null) return;
      item.content = content;
    }
    if (kind === "shortcut") {
      const target = window.prompt("Enter a website URL or a path on this site:", "https://");
      if (!target?.trim()) return;
      item.target = target.trim();
    }
    setLocalItems((current) => [...current, item]);
  };

  const activateLocalItem = (item: LocalDesktopItem) => {
    if (item.kind === "folder") {
      setLocalDialog({ kind: "folder", id: item.id });
      return;
    }
    if (item.kind === "file") {
      setFileDraft(item.content ?? "");
      setLocalDialog({ kind: "file", id: item.id });
      return;
    }
    try {
      const target = new URL(item.target ?? "", window.location.origin);
      if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("Unsupported URL protocol");
      if (target.origin === window.location.origin) {
        window.location.assign(`${target.pathname}${target.search}${target.hash}`);
      } else {
        window.open(target.href, "_blank", "noopener,noreferrer");
      }
    } catch {
      useOs.getState().notify("That shortcut URL is not valid.");
    }
  };

  const deleteLocalItem = (id: string) => {
    const ids = new Set([id]);
    let found = true;
    while (found) {
      found = false;
      for (const item of localItems) {
        if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
          ids.add(item.id);
          found = true;
        }
      }
    }
    setLocalItems((current) => current.filter((item) => !ids.has(item.id)));
    setIconPositions((current) => Object.fromEntries(Object.entries(current).filter(([key]) => ![...ids].some((deletedId) => key === `local:${deletedId}`))));
    setLocalDialog(null);
  };

  const renameLocalItem = (id: string) => {
    const item = localItems.find((entry) => entry.id === id);
    if (!item) return;
    const name = window.prompt("Rename item:", item.name)?.trim();
    if (!name) return;
    if (localItems.some((entry) => entry.id !== id && entry.parentId === item.parentId && entry.name.toLowerCase() === name.toLowerCase())) {
      useOs.getState().notify("An item with that name already exists here.");
      return;
    }
    setLocalItems((current) => current.map((entry) => entry.id === id ? { ...entry, name } : entry));
  };

  const saveLocalFile = (id: string) => {
    setLocalItems((current) => current.map((item) => item.id === id ? { ...item, content: fileDraft } : item));
    setLocalDialog(null);
  };

  const applySort = (mode: SortMode) => {
    const appBase = APP_ICONS.map((item) => item.app);
    const gameBase = GAME_ICONS.map((item) => item.app);
    const appSizes = Object.fromEntries(Object.entries(APP_META).map(([app, meta]) => [app, meta.w * meta.h]));
    const sort = (order: string[], fallback: string[]) => {
      if (mode === "default") return fallback;
      if (mode === "size") return sortDesktopIconsBySize(order, appSizes);
      return sortDesktopIcons(order, mode);
    };

    setAppOrder((current) => sort(current, appBase));
    setGameOrder((current) => sort(current, gameBase));
    if (mode !== "default") {
      setLocalItems((current) => [...current].sort((a, b) => mode === "desc" ? b.name.localeCompare(a.name) : mode === "size" ? (a.content?.length ?? 0) - (b.content?.length ?? 0) : a.name.localeCompare(b.name)));
    }
    setIconPositions({});
  };

  const menuItems: MenuItem[] = [
    { label: "Refresh", run: () => window.location.reload() },
    {
      label: "New",
      run: () => undefined,
      children: [
        { label: "Text file…", run: () => createLocalItem("file", menu?.parentId ?? null) },
        { label: "Folder", run: () => createLocalItem("folder", menu?.parentId ?? null) },
        { label: "Shortcut…", run: () => createLocalItem("shortcut", menu?.parentId ?? null) },
      ],
    },
    {
      label: "Change wallpaper",
      run: () => undefined,
      children: [
        { label: "Default", run: () => setWallpaper("default") },
        ...projects.map((project) => ({ label: project.title, run: () => setWallpaper(project.slug) })),
        { label: "Next wallpaper", run: nextWallpaper },
        { label: "Upload wallpaper…", run: () => wallpaperInputRef.current?.click() },
      ],
    },
    {
      label: "Sort",
      run: () => undefined,
      children: [
        { label: "Name (A–Z)", run: () => applySort("asc") },
        { label: "Name (Z–A)", run: () => applySort("desc") },
        { label: "By size (smallest first)", run: () => applySort("size") },
        { label: "Reset desktop order", run: () => applySort("default") },
      ],
    },
    { label: "Personalize", run: () => open("personalize") },
    { label: effectiveTheme === "dark" ? "Switch to light theme" : "Switch to dark theme", run: () => setTheme(effectiveTheme === "dark" ? "light" : "dark") },
    { label: "Open terminal", run: () => open("terminal") },
    { label: `About ${site.osName}`, run: () => open("about") },
    ...(menu?.itemId ? [
      { label: "Rename", run: () => renameLocalItem(menu.itemId!) },
      { label: "Delete", run: () => deleteLocalItem(menu.itemId!) },
    ] : []),
  ];

  const onIconClick = (e: React.MouseEvent, app: AppId) => {
    setSelected(app);
    if (coarse || e.detail >= 2) open(app);
  };

  const renderIcons = (group: "apps" | "games", list: DIcon[]) => {
    const desktopItems = group === "apps"
      ? [...list, ...localItems.filter((item) => item.parentId === null).map((item) => ({ app: `local:${item.id}`, label: item.name, icon: item.kind === "folder" ? "folder" as const : item.kind === "shortcut" ? "external" as const : "image" as const, localItem: item }))]
      : list;
    const order = group === "apps" ? [...appOrder, ...desktopItems.filter((item) => item.localItem).map((item) => item.app)] : gameOrder;

    return order.map((appId) => {
      const item = desktopItems.find((i) => i.app === appId);
      if (!item) return null;
      const isDragged = draggedApp?.app === item.app;
      const position = mobile ? undefined : iconPositions[item.app];
      const isMoving = !mobile && isDragged && dragMovedRef.current && dragPoint;
      const iconStyle = isMoving
        ? { position: "fixed" as const, left: dragPoint.x - dragOffsetRef.current.x, top: dragPoint.y - dragOffsetRef.current.y, zIndex: 9999, pointerEvents: "none" as const }
        : position ? { left: position.x, top: position.y } : undefined;
      return (
        <button
          key={item.app}
          className={`dicon ${position || isMoving ? "dicon-positioned" : ""} ${selected === item.app ? "dicon-sel" : ""} ${isDragged ? "dicon-dragging" : ""}`}
          style={iconStyle}
          data-app={item.app}
          data-icon-id={item.app}
          data-local-id={item.localItem?.id}
          data-group={group}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
            if (item.localItem) {
              if (coarse || e.detail >= 2) activateLocalItem(item.localItem);
            }
            else onIconClick(e, item.app as AppId);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (item.localItem) activateLocalItem(item.localItem);
            else open(item.app as AppId);
          }}
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
      <div className={`desktop ${draggedApp && dragMovedRef.current ? "desktop-dragging" : ""}`} onContextMenu={(e) => { if (!(e.target as HTMLElement).closest(".win, .taskbar, .start, .local-overlay")) { e.preventDefault(); const localIcon = (e.target as HTMLElement).closest<HTMLElement>(".dicon[data-local-id]"); const item = localItems.find((entry) => entry.id === localIcon?.dataset.localId); setMenu({ x: e.clientX, y: e.clientY, parentId: item?.kind === "folder" ? item.id : null, itemId: item?.id ?? null }); } }} onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".dicon")) setSelected(null); }}>
        <Wallpaper mounted={mounted} />
        <input
          ref={wallpaperInputRef}
          className="sr"
          type="file"
          accept="image/*"
          aria-label="Upload wallpaper image"
          onChange={(event) => {
            void uploadWallpaper(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        <main className="icons" aria-label="Desktop">
          <h1 className="sr">{site.name}, {site.role}</h1>
          <div className="icon-group" data-icon-group="apps" role="group" aria-label="Apps">{renderIcons("apps", APP_ICONS)}</div>
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

        {localDialog && (() => {
          const item = localItems.find((entry) => entry.id === localDialog.id);
          if (!item) return null;
          const children = localItems.filter((entry) => entry.parentId === item.id);
          return (
            <div className="local-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) setLocalDialog(null); }}>
              <section className="local-dialog" role="dialog" aria-modal="true" aria-labelledby="local-dialog-title">
                <header className="local-dialog-head">
                  <h2 id="local-dialog-title">{item.name}</h2>
                  <button type="button" className="local-close" onClick={() => setLocalDialog(null)} aria-label="Close">×</button>
                </header>
                {item.kind === "file" ? (
                  <>
                    <textarea className="local-editor" value={fileDraft} onChange={(event) => setFileDraft(event.target.value)} aria-label="Text file contents" />
                    <footer className="local-dialog-actions">
                      <button type="button" className="btn btn-danger" onClick={() => deleteLocalItem(item.id)}>Delete</button>
                      <span />
                      <button type="button" className="btn" onClick={() => setLocalDialog(null)}>Cancel</button>
                      <button type="button" className="btn" onClick={() => saveLocalFile(item.id)}>Save</button>
                    </footer>
                  </>
                ) : (
                  <>
                    <div className="local-folder-actions">
                      <button type="button" className="btn" onClick={() => createLocalItem("file", item.id)}>New text file</button>
                      <button type="button" className="btn" onClick={() => createLocalItem("folder", item.id)}>New folder</button>
                      <button type="button" className="btn" onClick={() => createLocalItem("shortcut", item.id)}>New shortcut</button>
                    </div>
                    <div className="local-folder-list">
                      {children.length ? children.map((child) => (
                        <button key={child.id} type="button" className="local-entry" onClick={() => activateLocalItem(child)}>
                          <Icon name={child.kind === "folder" ? "folder" : child.kind === "shortcut" ? "external" : "image"} size={20} />
                          <span>{child.name}</span>
                          <span className="dim">{child.kind}</span>
                        </button>
                      )) : <p className="dim small">This folder is empty.</p>}
                    </div>
                    <footer className="local-dialog-actions">
                      <button type="button" className="btn btn-danger" onClick={() => deleteLocalItem(item.id)}>Delete folder</button>
                    </footer>
                  </>
                )}
              </section>
            </div>
          );
        })()}

        <AnimatePresence>{locked && <LockScreen onEnter={enter} greeting={greeting} />}</AnimatePresence>
      </div>
    </ProjectsProvider>
    </SiteProfileProvider>
  );
}

