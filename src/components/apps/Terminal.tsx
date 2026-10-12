"use client";
import { useEffect, useRef, useState } from "react";
import { useSiteProfile } from "../os/site-profile-context";
import { useOs, usePrefs, type AppId } from "@/lib/store";
import { useProjects } from "../os/projects-context";

interface Line { kind: "in" | "out"; text: string }

const APPS: Record<string, AppId> = { hire: "hire", feedback: "reviews", work: "work", about: "about", mail: "mail", terminal: "terminal", personalize: "personalize", bin: "bin", reviews: "reviews", games: "games", snake: "snake", "2048": "g2048", minesweeper: "mines", memory: "memory", tictactoe: "ttt" };

export function Terminal() {
  const site = useSiteProfile();
  const open = useOs((s) => s.open);
  const projects = useProjects();
  const { setTheme, setWallpaper, wallpaper } = usePrefs();
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: `${site.osName} terminal. Type "help" to see what it can do.` }]);
  const [value, setValue] = useState("");
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [lines]);

  function run(raw: string): string[] | "clear" {
    const [cmd, ...args] = raw.trim().split(/\s+/);
    const arg = args.join(" ").toLowerCase();
    switch (cmd?.toLowerCase()) {
      case "": return [];
      case "help":
        return ["help             list commands", "ls               list projects", "open <name>      open a project, app or game (games, snake, 2048, minesweeper, memory, tictactoe)", "theme dark|light switch theme", "wallpaper next   cycle wallpaper", "whoami           who is this", "hire             open the Hire me page", "clear            clear the screen"];
      case "ls":
        return projects.map((p) => `${p.slug.padEnd(18)}${p.kind.padEnd(14)}${p.year}`);
      case "whoami":
        return [`${site.name}, ${site.role}`, site.tagline];
      case "hire":
        open("hire");
        return ["Opening Hire me..."];
      case "open": {
        if (!arg) return ["Usage: open <project-or-app>. Try \"ls\"."];
        if (APPS[arg]) { open(APPS[arg]); return [`Opening ${arg}...`]; }
        const hit = projects.find((p) => p.slug === arg) ?? projects.find((p) => p.slug.includes(arg) || p.title.toLowerCase().includes(arg));
        if (hit) { open("case", hit.slug); return [`Opening ${hit.title}...`]; }
        return [`Nothing called "${arg}". Try "ls".`];
      }
      case "theme":
        if (arg === "dark" || arg === "light") { setTheme(arg); return [`Theme set to ${arg}.`]; }
        return ["Usage: theme dark|light"];
      case "wallpaper": {
        const ids = ["default", ...projects.map((p) => p.slug)];
        const next = ids[(ids.indexOf(wallpaper) + 1) % ids.length];
        setWallpaper(next);
        return [`Wallpaper: ${next}`];
      }
      case "clear": return "clear";
      case "sudo": return ["Nice try. Access is granted through the contact form."];
      default: return [`${cmd}: command not found. Type "help".`];
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const cmd = value;
      if (cmd.trim()) history.current.push(cmd);
      cursor.current = history.current.length;
      const out = run(cmd);
      setLines((l) => (out === "clear" ? [] : [...l, { kind: "in", text: cmd }, ...out.map((t) => ({ kind: "out" as const, text: t }))]));
      setValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor.current = Math.max(0, cursor.current - 1);
      setValue(history.current[cursor.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor.current = Math.min(history.current.length, cursor.current + 1);
      setValue(history.current[cursor.current] ?? "");
    }
  }

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      <div role="log" aria-live="polite" className="term-log">
        {lines.map((l, i) => (
          <pre key={i} className={l.kind === "in" ? "term-in" : "term-out"}>{l.kind === "in" ? `> ${l.text}` : l.text}</pre>
        ))}
        <div ref={endRef} />
      </div>
      <div className="term-line">
        <span aria-hidden="true">&gt;</span>
        <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onKey} aria-label="Terminal command" spellCheck={false} autoCapitalize="off" autoComplete="off" />
      </div>
    </div>
  );
}
