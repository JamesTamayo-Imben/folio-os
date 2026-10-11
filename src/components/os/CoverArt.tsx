import type { Palette, Project, Shape } from "@/data/projects";

export const coverBackground = ([a, b, c, base]: Palette) =>
  `radial-gradient(60% 70% at 15% 20%, ${a} 0%, transparent 62%), radial-gradient(55% 65% at 88% 28%, ${b} 0%, transparent 60%), radial-gradient(75% 70% at 55% 100%, ${c} 0%, transparent 62%), ${base}`;

/** Wallpaper/thumbnail background: the real cover image when there is one, otherwise generated art. */
export const projectBackground = (p: Pick<Project, "palette" | "coverUrl">) =>
  p.coverUrl ? `linear-gradient(rgba(8,10,24,0.25), rgba(8,10,24,0.25)), url("${p.coverUrl}") center / cover no-repeat, ${p.palette[3]}` : coverBackground(p.palette);

function Overlay({ shape }: { shape: Shape }) {
  const common = { fill: "none", stroke: "#fff", strokeOpacity: 0.28, strokeWidth: 1.5 } as const;
  switch (shape) {
    case "rings":
      return (
        <g {...common}>
          {[40, 80, 120, 160, 200].map((r) => (
            <circle key={r} cx={290} cy={70} r={r} />
          ))}
        </g>
      );
    case "bars":
      return (
        <g fill="#fff" fillOpacity={0.14}>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={30 + i * 42} y={250 - (40 + ((i * 37) % 120))} width={26} height={40 + ((i * 37) % 120)} rx={13} />
          ))}
        </g>
      );
    case "blob":
      return <path d="M60 190c40-90 120-120 190-80s110 20 100-40v170H60z" fill="#fff" fillOpacity={0.16} />;
    case "grid":
      return (
        <g {...common} strokeOpacity={0.22}>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={`v${i}`} d={`M${i * 50} 0V250`} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <path key={`h${i}`} d={`M0 ${i * 50}H400`} />
          ))}
          <path d="M0 200L120 130L200 160L320 60L400 90" strokeOpacity={0.7} strokeWidth={3} />
        </g>
      );
  }
}

export function CoverArt({ palette, shape, coverUrl, label, className = "" }: { palette: Palette; shape: Shape; coverUrl?: string | null; label?: string; className?: string }) {
  return (
    <div className={`cover ${className}`} style={{ background: coverBackground(palette) }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" loading="lazy" decoding="async" className="cover-img" />
      ) : (
        <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <Overlay shape={shape} />
        </svg>
      )}
    </div>
  );
}
