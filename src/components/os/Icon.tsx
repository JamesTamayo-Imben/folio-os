const c = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const paths = {
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  user: [c(12, 8, 3.5), "M5 20a7 7 0 0 1 14 0"],
  mail: ["M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z", "M3.5 7.5l8.5 6 8.5-6"],
  terminal: ["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M7 9l3.5 3L7 15", "M13 15h4"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13", "M10 11v6", "M14 11v6"],
  sliders: ["M4 7h9", "M17 7h3", c(15, 7, 2), "M4 17h3", "M11 17h9", c(9, 17, 2)],
  search: [c(11, 11, 6), "M20 20l-4.2-4.2"],
  sun: [c(12, 12, 4), "M12 2v2", "M12 20v2", "M2 12h2", "M20 12h2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
  moon: ["M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"],
  wifi: ["M2 9a15 15 0 0 1 20 0", "M5 12.5a10 10 0 0 1 14 0", "M8.5 16a5 5 0 0 1 7 0", "M12 19.5h.01"],
  battery: ["M3 8h15a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z", "M21 11v2", "M5 10.5v3"],
  lock: ["M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z", "M8 11V8a4 4 0 0 1 8 0v3"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  minimize: ["M6 12h12"],
  maximize: ["M6 6h12v12H6z"],
  restore: ["M9 9h9v9H9z", "M6 15V6h9"],
  image: ["M4 5h16v14H4z", "M4 16l5-5 4 4 3-3 4 4"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  send: ["M21 3L10 14", "M21 3l-7 18-4-7-7-4z"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  power: ["M12 3v8", "M6.5 6.5a8 8 0 1 0 11 0"],
  download: ["M12 4v11", "M7 11l5 5 5-5", "M5 20h14"],
  star: ["M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"],
  snake: ["M5 19h6a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h9", "M18 5h.01"],
  tiles: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  flag: ["M6 21V4", "M6 4h11l-2.5 4L17 12H6"],
  cards: ["M7 6h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z", "M9 3h9a2 2 0 0 1 2 2v11"],
  hash: ["M9 4L7 20", "M17 4l-2 16", "M4 9h16", "M3.5 15h16"],
  gamepad: [
    "M1.49 9.34 0.93 10.71 0.63 11.61 0.3 12.91 0.07 14.37 0.04 16.04 0.19 17.12 0.52 18.2 1.04 19.1 1.6 19.51 2.2 19.66 2.76 19.66 3.13 19.58 3.76 19.32 4.1 19.02 4.66 18.24 5.63 17.09 6.63 16.08 7.49 15.45 8.16 15.11 9.06 14.81 10.02 14.59 11.14 14.44 12.78 14.44 13.94 14.59 15.06 14.85 16.32 15.37 17.33 16.08 18.22 16.98 20.09 19.25 20.68 19.55 21.2 19.66 21.73 19.66 22.29 19.55 22.99 18.99 23.52 18.02 23.85 16.71 23.93 16.01 23.93 14.81 23.66 12.91 23.07 10.79 22.66 9.75 22.02 8.4 20.91 6.58 20.2 5.68 19.64 5.12 19.08 4.71 18.63 4.49 18.26 4.38 17.44 4.42 16.7 4.79 14.94 5.98 14.12 6.39 13.49 6.61 12.78 6.76 11.52 6.8 10.62 6.65 9.5 6.24 8.72 5.8 7.23 4.75 6.67 4.45 6.26 4.34 5.81 4.34 5.48 4.42 5.07 4.6 4.55 4.94 3.58 5.91 2.57 7.32 2.09 8.14Z M4.88 7.73 5.89 7.73 5.89 9.63 7.79 9.63 7.79 10.64 5.89 10.64 5.89 12.54 4.88 12.54 4.88 10.64 3.02 10.64 3.02 9.63 4.88 9.63Z M9.2 11.42h1.83v1.01h-1.83z M12.97 11.42h1.6v1.01h-1.6z M17.68 8.16a0.91 0.91 0 1 0 1.83 0a0.91 0.91 0 1 0 -1.83 0 M15.8 10.06a0.91 0.91 0 1 0 1.83 0a0.91 0.91 0 1 0 -1.83 0 M19.57 10.06a0.91 0.91 0 1 0 1.83 0a0.91 0.91 0 1 0 -1.83 0 M17.68 11.94a0.91 0.91 0 1 0 1.83 0a0.91 0.91 0 1 0 -1.83 0",
  ],
  briefcase: ["M4 8h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z", "M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2", "M3 13h18"],
  plus: ["M12 5v14", "M5 12h14"],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"],
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const isFilled = name === "gamepad";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={isFilled ? "currentColor" : "none"} fillRule="evenodd" stroke={isFilled ? "none" : "currentColor"} strokeWidth={isFilled ? undefined : 1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** The FolioOS mark: four tiles, one lit by the accent color. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.2" fill="currentColor" opacity="0.9" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="4.25" fill="var(--accent)" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.2" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.2" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
