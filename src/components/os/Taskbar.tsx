"use client";
import { useOs, usePrefs, type Win } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { useClock } from "./hooks";
import { Icon, Logo } from "./Icon";
import { useWinTitle } from "./projects-context";
import { APP_ICON } from "./Window";

function WindowButton({ win, active, onClick }: { win: Win; active: boolean; onClick: () => void }) {
  const title = useWinTitle(win);
  return (
    <button className={`tb-btn tb-app ${active ? "tb-active" : ""} ${win.minimized ? "tb-min" : ""}`} onClick={onClick} aria-label={`${title}${win.minimized ? " (minimized)" : ""}`} aria-pressed={active} title={title}>
      <Icon name={APP_ICON[win.app]} size={20} />
    </button>
  );
}

export function Taskbar({ effectiveTheme, autoHideEnabled = false }: { effectiveTheme: "dark" | "light"; autoHideEnabled?: boolean }) {
  const { windows, focusedId, startOpen, setStart, focus, minimize, open } = useOs();
  const { setTheme, taskbarPosition } = usePrefs();
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useClock();

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const reveal = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setRevealed(true);
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRevealed(false), 280);
  };

  const onWindowButton = (id: string, minimized: boolean) => {
    if (minimized || focusedId !== id) focus(id);
    else minimize(id);
  };

  return (
    <>
    {autoHideEnabled && <button className={`taskbar-edge-trigger taskbar-edge-${taskbarPosition}`} type="button" aria-label="Show taskbar" onPointerEnter={reveal} onFocus={reveal} onClick={reveal} />}
    <nav className={`taskbar taskbar-${taskbarPosition} ${autoHideEnabled ? "taskbar-autohide" : ""} ${revealed ? "taskbar-revealed" : ""}`} aria-label="Taskbar" onPointerEnter={reveal} onPointerLeave={autoHideEnabled ? scheduleHide : undefined} onFocusCapture={reveal} onBlurCapture={(event) => { if (autoHideEnabled && !event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleHide(); }}>
      <div className="tb-center">
        <button className={`tb-btn ${startOpen ? "tb-active" : ""}`} onClick={() => setStart(!startOpen)} aria-label="Start" aria-expanded={startOpen} aria-controls="start-menu" aria-haspopup="dialog">
          <Logo />
        </button>
        <button className="tb-search" onClick={() => setStart(true)} aria-label="Search (Ctrl+K)">
          <Icon name="search" size={16} />
          <span>Search</span>
        </button>
        {windows.map((w) => (
          <WindowButton key={w.id} win={w} active={focusedId === w.id && !w.minimized} onClick={() => onWindowButton(w.id, w.minimized)} />
        ))}
        {windows.length === 0 && (
          <button className="tb-btn" onClick={() => open("work")} aria-label="Open Work" title="Work">
            <Icon name="folder" size={20} />
          </button>
        )}
      </div>

      <div className="tb-tray">
        <button className="tb-hire" onClick={() => open("hire")} aria-label="Hire me">
          <Icon name="briefcase" size={16} />
          <span>Hire me</span>
        </button>
        <button className="tb-btn" onClick={() => setTheme(effectiveTheme === "dark" ? "light" : "dark")} aria-label={`Switch to ${effectiveTheme === "dark" ? "light" : "dark"} theme`}>
          <Icon name={effectiveTheme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <span className="tb-status" aria-hidden="true">
          <Icon name="wifi" size={16} />
          <Icon name="battery" size={16} />
        </span>
        <time className="tb-clock" dateTime={now?.toISOString()}>
          {now ? (
            <>
              <span>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              <span>{now.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
            </>
          ) : null}
        </time>
        {/* Secret door: a thin strip at the far right edge. Appears on hover or keyboard focus. */}
        <a className="tb-secret" href="/admin/login" aria-label="Admin sign in" title="">
          <Icon name="lock" size={12} />
        </a>
      </div>
    </nav>
    </>
  );
}
