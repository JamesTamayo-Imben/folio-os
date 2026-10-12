"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { TASKBAR, useOs, type Win } from "@/lib/store";
import { Icon, type IconName } from "./Icon";
import { useWinTitle } from "./projects-context";

export const APP_ICON: Record<Win["app"], IconName> = {
  hire: "briefcase",
  work: "folder",
  case: "image",
  about: "user",
  mail: "mail",
  terminal: "terminal",
  personalize: "sliders",
  bin: "trash",
  reviews: "star",
  games: "gamepad",
  snake: "snake",
  g2048: "tiles",
  mines: "flag",
  memory: "cards",
  ttt: "hash",
};

const MIN_W = 320;
const MIN_H = 240;

export function WindowFrame({ win, mobile, children }: { win: Win; mobile: boolean; children: React.ReactNode }) {
  const { focus, close, minimize, toggleMax, move, resize, focusedId } = useOs();
  const reduce = useReducedMotion();
  const title = useWinTitle(win);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const size = useRef<{ px: number; py: number; w: number; h: number } | null>(null);

  const focused = focusedId === win.id && !win.minimized;
  const maximized = win.maximized || mobile;

  // Move keyboard focus into the window when it becomes active, without stealing it from inner fields.
  useEffect(() => {
    if (focused && ref.current && !ref.current.contains(document.activeElement)) {
      ref.current.focus({ preventScroll: true });
    }
  }, [focused]);

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    focus(win.id);
    if (maximized || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y };
  };
  const onTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const x = Math.min(window.innerWidth - 80, Math.max(-(win.w - 80), d.x + e.clientX - d.px));
    const y = Math.min(window.innerHeight - TASKBAR - 40, Math.max(0, d.y + e.clientY - d.py));
    move(win.id, x, y);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    focus(win.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    size.current = { px: e.clientX, py: e.clientY, w: win.w, h: win.h };
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = size.current;
    if (!s) return;
    resize(win.id, Math.max(MIN_W, s.w + e.clientX - s.px), Math.max(MIN_H, s.h + e.clientY - s.py));
  };

  const style: React.CSSProperties = maximized
    ? { left: 0, top: 0, width: "100%", height: `calc(100% - ${TASKBAR}px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  const t = reduce ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] };

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      aria-hidden={win.minimized || undefined}
      className={`win ${focused ? "win-focused" : ""} ${maximized ? "win-max" : ""}`}
      style={style}
      onPointerDown={() => focus(win.id)}
      initial={{ opacity: 0, scale: 0.965, y: 10 }}
      animate={win.minimized ? { opacity: 0, scale: 0.94, y: 24, transitionEnd: { visibility: "hidden" } } : { opacity: 1, scale: 1, y: 0, visibility: "visible" }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: reduce ? 0 : 0.12 } }}
      transition={t}
    >
      <div className="win-title" onPointerDown={onTitleDown} onPointerMove={onTitleMove} onPointerUp={endDrag} onPointerCancel={endDrag} onDoubleClick={() => !mobile && toggleMax(win.id)}>
        <Icon name={APP_ICON[win.app]} size={16} />
        <span className="win-name">{title}</span>
        <div className="win-ctl">
          <button className="ctl" onClick={() => minimize(win.id)} aria-label={`Minimize ${title}`}>
            <Icon name="minimize" size={16} />
          </button>
          {!mobile && (
            <button className="ctl" onClick={() => toggleMax(win.id)} aria-label={win.maximized ? `Restore ${title}` : `Maximize ${title}`}>
              <Icon name={win.maximized ? "restore" : "maximize"} size={16} />
            </button>
          )}
          <button className="ctl ctl-close" onClick={() => close(win.id)} aria-label={`Close ${title}`}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
      <div className="win-body">{children}</div>
      {!maximized && <div className="win-resize" onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={() => (size.current = null)} aria-hidden="true" />}
    </motion.div>
  );
}
