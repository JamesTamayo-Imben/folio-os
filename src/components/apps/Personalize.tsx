"use client";
import { ACCENTS, usePrefs } from "@/lib/store";
import { coverBackground, projectBackground } from "../os/CoverArt";
import { useProjects } from "../os/projects-context";
import { Icon } from "../os/Icon";
import { defaultPalette } from "../os/Wallpaper";

export function Personalize() {
  const { theme, accent, wallpaper, setTheme, setAccent, setWallpaper } = usePrefs();
  const projects = useProjects();
  const walls = [{ id: "default", name: "Dusk", bg: coverBackground(defaultPalette) }, ...projects.map((p) => ({ id: p.slug, name: p.title, bg: projectBackground(p) }))];
  const effectiveTheme = theme ?? "dark";

  return (
    <div className="pad personalize">
      <h1 className="about-name">Personalize</h1>

      <h2>Theme</h2>
      <div className="seg" role="radiogroup" aria-label="Theme">
        {(["dark", "light"] as const).map((t) => (
          <button key={t} role="radio" aria-checked={effectiveTheme === t} className="seg-btn" onClick={() => setTheme(t)}>
            <Icon name={t === "dark" ? "moon" : "sun"} size={16} /> {t === "dark" ? "Dark" : "Light"}
          </button>
        ))}
      </div>

      <h2>Accent color</h2>
      <div className="swatches" role="radiogroup" aria-label="Accent color">
        {ACCENTS.map((a) => (
          <button key={a.id} role="radio" aria-checked={accent === a.value} aria-label={a.name} className="swatch" style={{ background: a.value }} onClick={() => setAccent(a.value)}>
            {accent === a.value && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>

      <h2>Wallpaper</h2>
      <p className="dim small">Each project doubles as a wallpaper.</p>
      <div className="walls" role="radiogroup" aria-label="Wallpaper">
        {walls.map((w) => (
          <button key={w.id} role="radio" aria-checked={wallpaper === w.id} className="wall" onClick={() => setWallpaper(w.id)}>
            <span className="wall-thumb" style={{ background: w.bg }} />
            <span className="wall-name">{w.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
