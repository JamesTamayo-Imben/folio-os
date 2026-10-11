"use client";
import { useEffect, useRef } from "react";
import { useOs, type AppId } from "@/lib/store";

/** True while this game's window is the active, visible one. */
export function useWindowFocused(app: AppId) {
  return useOs((s) => {
    const w = s.windows.find((x) => x.app === app);
    return !!w && s.focusedId === w.id && !w.minimized && !s.locked;
  });
}

/** Keyboard input for a game, delivered only while its window is active. */
export function useGameKeys(app: AppId, handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const s = useOs.getState();
      const w = s.windows.find((x) => x.app === app);
      if (!w || s.focusedId !== w.id || w.minimized || s.startOpen || s.locked) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (t.closest("button") && (e.key === " " || e.key === "Enter")) return; // let the button act
      ref.current(e);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [app]);
}

/** Swipe detection on any element. Calls back with a direction once the finger or mouse has moved far enough. */
export function useSwipe(onSwipe: (dir: "left" | "right" | "up" | "down") => void, min = 24) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return;
      onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    },
    style: { touchAction: "none" } as React.CSSProperties,
  };
}
