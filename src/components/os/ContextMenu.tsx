"use client";
import { useEffect, useRef, useState } from "react";

export interface MenuItem {
  label: string;
  run: () => void;
  children?: MenuItem[];
}

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLUListElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

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

  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const left = Math.max(8, Math.min(x, viewportWidth - 220));
  const top = Math.max(8, Math.min(y, viewportHeight - items.length * 40 - 80));
  const flipSubmenu = left + 440 > viewportWidth;

  const renderItems = (menuItems: MenuItem[]) => menuItems.map((item) => (
    <li key={item.label} role="none" className={`${item.children ? "ctx-has-submenu" : ""} ${openSubmenu === item.label ? "ctx-submenu-open" : ""}`}>
      <button
        type="button"
        role="menuitem"
        className={`ctx-item ${item.children ? "ctx-submenu-trigger" : ""}`}
        aria-haspopup={item.children ? "menu" : undefined}
        aria-expanded={item.children ? openSubmenu === item.label : undefined}
        onClick={() => {
          if (item.children) {
            setOpenSubmenu((current) => current === item.label ? null : item.label);
          } else {
            item.run();
            onClose();
          }
        }}
        onKeyDown={(event) => {
          if (item.children && event.key === "ArrowRight") {
            event.preventDefault();
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".ctx-submenu button")?.focus();
          }
        }}
      >
        {item.label}
      </button>
      {item.children && <ul className="ctx-submenu" role="menu">{renderItems(item.children)}</ul>}
    </li>
  ));

  return (
    <ul ref={ref} className={`ctx ${flipSubmenu ? "ctx-flip-submenu" : ""}`} role="menu" style={{ left, top }}>
      {renderItems(items)}
    </ul>
  );
}
