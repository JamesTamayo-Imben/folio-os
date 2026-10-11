export type Board = number[]; // 16 cells, row-major
export type Dir = "left" | "right" | "up" | "down";
export type Rng = () => number;

export function slideLine(line: number[]): { line: number[]; gained: number; moved: boolean } {
  const nums = line.filter(Boolean);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      out.push(nums[i] * 2);
      gained += nums[i] * 2;
      i++;
    } else out.push(nums[i]);
  }
  while (out.length < 4) out.push(0);
  return { line: out, gained, moved: out.some((v, i) => v !== line[i]) };
}

const lineIndices = (dir: Dir): number[][] =>
  Array.from({ length: 4 }, (_, a) =>
    Array.from({ length: 4 }, (_, b) => {
      switch (dir) {
        case "left": return a * 4 + b;
        case "right": return a * 4 + (3 - b);
        case "up": return b * 4 + a;
        case "down": return (3 - b) * 4 + a;
      }
    }),
  );

export function move(board: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  const next = board.slice();
  let gained = 0;
  let moved = false;
  for (const idxs of lineIndices(dir)) {
    const r = slideLine(idxs.map((i) => board[i]));
    idxs.forEach((cell, k) => (next[cell] = r.line[k]));
    gained += r.gained;
    moved ||= r.moved;
  }
  return { board: next, gained, moved };
}

export function addRandom(board: Board, rng: Rng = Math.random): Board {
  const empty = board.flatMap((v, i) => (v === 0 ? [i] : []));
  if (empty.length === 0) return board;
  const next = board.slice();
  next[empty[Math.floor(rng() * empty.length)]] = rng() < 0.9 ? 2 : 4;
  return next;
}

export const newBoard = (rng: Rng = Math.random): Board => addRandom(addRandom(Array(16).fill(0), rng), rng);

export const canMove = (board: Board) => (["left", "right", "up", "down"] as Dir[]).some((d) => move(board, d).moved);
export const hasWon = (board: Board) => board.some((v) => v >= 2048);
