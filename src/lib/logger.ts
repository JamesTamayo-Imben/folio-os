type Level = "info" | "warn" | "error";

/** One JSON line per event. Never pass message bodies or personal data in ctx. */
export function log(level: Level, msg: string, ctx: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
