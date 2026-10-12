"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { track } from "./track";

export const TASKBAR = 56;

export type AppId = "hire" | "work" | "case" | "about" | "mail" | "terminal" | "personalize" | "bin" | "reviews" | "games" | "snake" | "g2048" | "mines" | "memory" | "ttt" | "notepad" | "draw" | "gallery" | "calendar" | "calculator" | "camera";
export type Theme = "dark" | "light";

export interface Win {
  id: string;
  app: AppId;
  param?: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
}

export interface Toast {
  id: number;
  text: string;
}

export const APP_META: Record<AppId, { title: string; w: number; h: number }> = {
  hire: { title: "Hire me", w: 640, h: 660 },
  work: { title: "Work", w: 860, h: 580 },
  case: { title: "Case study", w: 900, h: 640 },
  about: { title: "About", w: 600, h: 520 },
  mail: { title: "Mail", w: 540, h: 580 },
  terminal: { title: "Terminal", w: 640, h: 420 },
  personalize: { title: "Personalize", w: 600, h: 560 },
  bin: { title: "Recycle Bin", w: 620, h: 480 },
  reviews: { title: "Feedback", w: 580, h: 620 },
  games: { title: "Games", w: 560, h: 520 },
  snake: { title: "Snake", w: 440, h: 580 },
  g2048: { title: "2048", w: 440, h: 620 },
  mines: { title: "Minesweeper", w: 440, h: 600 },
  memory: { title: "Memory Match", w: 480, h: 580 },
  ttt: { title: "Tic-Tac-Toe", w: 400, h: 540 },
  notepad: { title: "Notepad", w: 760, h: 560 },
  draw: { title: "Draw", w: 920, h: 700 },
  gallery: { title: "Journey Gallery", w: 860, h: 640 },
  calendar: { title: "Calendar", w: 760, h: 620 },
  calculator: { title: "Calculator", w: 380, h: 560 },
  camera: { title: "Camera", w: 820, h: 640 },
};

const winId = (app: AppId, param?: string) => `${app}:${param ?? ""}`;

const topVisibleId = (windows: Win[]) =>
  windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null;

interface OsState {
  windows: Win[];
  zCounter: number;
  focusedId: string | null;
  startOpen: boolean;
  locked: boolean;
  toasts: Toast[];
  open: (app: AppId, param?: string) => void;
  close: (id: string) => void;
  minimize: (id: string) => void;
  toggleMax: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  closeCases: () => void;
  setStart: (v: boolean) => void;
  setLocked: (v: boolean) => void;
  notify: (text: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useOs = create<OsState>((set, get) => ({
  windows: [],
  zCounter: 10,
  focusedId: null,
  startOpen: false,
  locked: true,
  toasts: [],

  open: (app, param) => {
    if (app === "case" && param) track("project_open", { project: param });
    if (app === "hire") track("hire_open");
    set((s) => {
      const id = winId(app, param);
      const z = s.zCounter + 1;
      const existing = s.windows.find((w) => w.id === id);
      if (existing) {
        return {
          windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, z } : w)),
          zCounter: z,
          focusedId: id,
          startOpen: false,
        };
      }
      const meta = APP_META[app];
      const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
      const vh = typeof window === "undefined" ? 800 : window.innerHeight;
      const w = Math.min(meta.w, vw - 24);
      const h = Math.min(meta.h, vh - TASKBAR - 24);
      const n = s.windows.length % 6;
      const x = Math.max(8, Math.round((vw - w) / 2) + n * 28 - 60);
      const y = Math.max(8, Math.round((vh - TASKBAR - h) / 2) + n * 24 - 40);
      const title = meta.title; // case study titles are resolved at render time from the project list
      const win: Win = { id, app, param, title, x, y, w, h, minimized: false, maximized: false, z };
      return { windows: [...s.windows, win], zCounter: z, focusedId: id, startOpen: false };
    });
  },

  close: (id) =>
    set((s) => {
      const windows = s.windows.filter((w) => w.id !== id);
      return { windows, focusedId: s.focusedId === id ? topVisibleId(windows) : s.focusedId };
    }),

  minimize: (id) =>
    set((s) => {
      const windows = s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
      return { windows, focusedId: s.focusedId === id ? topVisibleId(windows) : s.focusedId };
    }),

  toggleMax: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) })),

  focus: (id) =>
    set((s) => {
      if (s.focusedId === id && !s.startOpen) return s;
      const z = s.zCounter + 1;
      return { windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)), zCounter: z, focusedId: id, startOpen: false };
    }),

  move: (id, x, y) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),

  resize: (id, w, h) => set((s) => ({ windows: s.windows.map((win) => (win.id === id ? { ...win, w, h } : win)) })),

  closeCases: () =>
    set((s) => {
      const windows = s.windows.filter((w) => w.app !== "case");
      const focusedId = windows.some((w) => w.id === s.focusedId) ? s.focusedId : topVisibleId(windows);
      return { windows, focusedId };
    }),

  setStart: (v) => set({ startOpen: v }),
  setLocked: (v) => set({ locked: v, startOpen: false }),

  notify: (text) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ---------- Personalization (persisted) ---------- */

export const ACCENTS = [
  { id: "iris", name: "Iris", value: "#6c7bff" },
  { id: "citrus", name: "Citrus", value: "#ffc93c" },
  { id: "coral", name: "Coral", value: "#ff7a6b" },
  { id: "mint", name: "Mint", value: "#4fd6b0" },
  { id: "orchid", name: "Orchid", value: "#d58cff" },
] as const;

interface PrefsState {
  theme: Theme | null; // null follows the system setting
  accent: string;
  wallpaper: string; // project slug or "default"
  taskbarPosition: "bottom" | "left" | "right";
  taskbarAutoHide: boolean;
  setTheme: (t: Theme) => void;
  setAccent: (a: string) => void;
  setWallpaper: (w: string) => void;
  setTaskbarPosition: (position: "bottom" | "left" | "right") => void;
  setTaskbarAutoHide: (autoHide: boolean) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: null,
      accent: ACCENTS[0].value,
      wallpaper: "default",
      taskbarPosition: "bottom",
      taskbarAutoHide: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setTaskbarPosition: (taskbarPosition) => set({ taskbarPosition }),
      setTaskbarAutoHide: (taskbarAutoHide) => set({ taskbarAutoHide }),
    }),
    { name: "folio-os-prefs", version: 1 },
  ),
);

/* ---------- Game scores (persisted) ---------- */

interface ScoreState {
  best: Record<string, number>;
  /** Keeps the better value: highest for scores, lowest for times and move counts. */
  record: (game: string, value: number, better: "max" | "min") => boolean;
  add: (key: string) => void;
}

export const useScores = create<ScoreState>()(
  persist(
    (set, get) => ({
      best: {},
      record: (game, value, better) => {
        const cur = get().best[game];
        const isBetter = cur === undefined || (better === "max" ? value > cur : value < cur);
        if (isBetter) set((s) => ({ best: { ...s.best, [game]: value } }));
        return isBetter;
      },
      add: (key) => set((s) => ({ best: { ...s.best, [key]: (s.best[key] ?? 0) + 1 } })),
    }),
    { name: "folio-os-scores", version: 1 },
  ),
);
