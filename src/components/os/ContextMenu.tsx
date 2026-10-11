"use client";
import { useEffect, useRef } from "react";

export interface MenuItem {
  label: string;
  run: () => void;
}

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const left = Math.min(x, (typeof window === "undefined" ? 1200 : window.innerWidth) - 220);
  const top = Math.min(y, (typeof window === "undefined" ? 800 : window.innerHeight) - items.length * 40 - 80);

  return (
    <ul ref={ref} className="ctx" role="menu" style={{ left, top }}>
      {items.map((it) => (
        <li key={it.label} role="none">
          <button role="menuitem" className="ctx-item" onClick={() => { it.run(); onClose(); }}>
            {it.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
