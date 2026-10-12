export type DropPosition = "before" | "after";
export type SortDirection = "asc" | "desc";
export type SortMode = SortDirection | "size" | "default";

export function reorderDesktopIcons<T extends string>(items: T[], fromId: T, toId: T, position: DropPosition = "before"): T[] {
  if (!items.includes(fromId) || !items.includes(toId) || fromId === toId) return items;

  const next = [...items];
  const fromIndex = next.indexOf(fromId);
  const toIndex = next.indexOf(toId);

  next.splice(fromIndex, 1);
  const insertAt = position === "after" ? toIndex + 1 : toIndex;
  next.splice(Math.max(0, Math.min(insertAt, next.length)), 0, fromId);

  return next;
}

export function sortDesktopIcons<T extends string>(items: T[], direction: SortDirection = "asc"): T[] {
  return [...items].sort((a, b) => {
    const diff = a.localeCompare(b);
    return direction === "asc" ? diff : -diff;
  });
}

export function sortDesktopIconsBySize<T extends string>(items: T[], sizes: Readonly<Record<string, number>>): T[] {
  return [...items].sort((a, b) => (sizes[a] ?? 0) - (sizes[b] ?? 0) || a.localeCompare(b));
}
