import type { Rng } from "./game2048";

export interface Cell {
  mine: boolean;
  adj: number;
  revealed: boolean;
  flagged: boolean;
}
export interface MsBoard {
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[];
  started: boolean;
}

export const createBoard = (rows: number, cols: number, mines: number): MsBoard => ({
  rows,
  cols,
  mines,
  started: false,
  cells: Array.from({ length: rows * cols }, () => ({ mine: false, adj: 0, revealed: false, flagged: false })),
});

export function neighbors(b: Pick<MsBoard, "rows" | "cols">, i: number): number[] {
  const r = Math.floor(i / b.cols);
  const c = i % b.cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < b.rows && cc >= 0 && cc < b.cols) out.push(rr * b.cols + cc);
    }
  return out;
}

/** Places mines after the first click so the first reveal (and its neighbors) is always safe. */
export function placeMines(b: MsBoard, safe: number, rng: Rng = Math.random): MsBoard {
  const banned = new Set([safe, ...neighbors(b, safe)]);
  const pool = b.cells.map((_, i) => i).filter((i) => !banned.has(i));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const cells = b.cells.map((c) => ({ ...c }));
  pool.slice(0, b.mines).forEach((i) => (cells[i].mine = true));
  cells.forEach((c, i) => (c.adj = neighbors(b, i).filter((n) => cells[n].mine).length));
  return { ...b, cells, started: true };
}

/** Reveal a cell. Zero cells flood outward. Returns the new board and whether a mine was hit. */
export function reveal(b: MsBoard, i: number, rng: Rng = Math.random): { board: MsBoard; hitMine: boolean } {
  let board = b.started ? b : placeMines(b, i, rng);
  const cells = board.cells.map((c) => ({ ...c }));
  if (cells[i].revealed || cells[i].flagged) return { board, hitMine: false };
  if (cells[i].mine) {
    cells[i].revealed = true;
    cells.forEach((c) => c.mine && !c.flagged && (c.revealed = true));
    return { board: { ...board, cells }, hitMine: true };
  }
  const stack = [i];
  while (stack.length) {
    const cur = stack.pop()!;
    const c = cells[cur];
    if (c.revealed || c.flagged) continue;
    c.revealed = true;
    if (c.adj === 0) stack.push(...neighbors(board, cur));
  }
  board = { ...board, cells };
  return { board, hitMine: false };
}

export function toggleFlag(b: MsBoard, i: number): MsBoard {
  if (b.cells[i].revealed) return b;
  const cells = b.cells.map((c, k) => (k === i ? { ...c, flagged: !c.flagged } : c));
  return { ...b, cells };
}

export const isWon = (b: MsBoard) => b.started && b.cells.every((c) => c.mine || c.revealed);
export const flagsUsed = (b: MsBoard) => b.cells.filter((c) => c.flagged).length;
