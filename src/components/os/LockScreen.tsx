"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { initials, site } from "@/config/site";
import type { PublicGreeting } from "@/lib/applicationsRepo";
import { useClock } from "./hooks";
import { Icon } from "./Icon";

export function LockScreen({ onEnter, greeting }: { onEnter: (hire?: boolean) => void; greeting?: Pick<PublicGreeting, "company" | "role" | "note"> | null }) {
  const now = useClock();
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btn.current?.focus();
  }, []);

  return (
    <motion.div
      className="lock"
      role="dialog"
      aria-label="Lock screen"
      initial={{ opacity: 1, y: 0 }}
      exit={{ y: reduce ? 0 : "-100%", opacity: reduce ? 0 : 1, transition: { duration: reduce ? 0 : 0.5, ease: [0.7, 0, 0.2, 1] } }}
    >
      <div className="lock-time">
        <div className="lock-clock">{now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "\u00A0"}</div>
        <div className="lock-date">{now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "\u00A0"}</div>
      </div>
      <div className="lock-user">
        {greeting && (
          <p className="lock-greeting">
            Prepared for <strong>{greeting.company}</strong>
            {greeting.role ? ` \u00B7 ${greeting.role}` : ""}
          </p>
        )}
        <div className="avatar lg" aria-hidden="true">{initials}</div>
        <h1 className="lock-name">{site.name}</h1>
        <p className="lock-role">{site.role}</p>
        {greeting?.note && <p className="lock-note">{greeting.note}</p>}
        <div className="row lock-actions">
          <button ref={btn} className="btn" onClick={() => onEnter(false)}>
            <Icon name="arrow" size={16} /> Enter portfolio
          </button>
          <button className="btn btn-glass" onClick={() => onEnter(true)}>
            <Icon name="briefcase" size={16} /> Hire me
          </button>
        </div>
        <p className="lock-hint dim small">{site.osName}</p>
      </div>
    </motion.div>
  );
}
