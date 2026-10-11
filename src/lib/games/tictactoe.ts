import type { Rng } from "./game2048";

export type Mark = "X" | "O" | null;
export type Result = "X" | "O" | "draw" | null;

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function winningLine(b: Mark[]): number[] | null {
  return LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]) ?? null;
}

export function result(b: Mark[]): Result {
  const line = winningLine(b);
  if (line) return b[line[0]] as "X" | "O";
  return b.every(Boolean) ? "draw" : null;
}

function minimax(b: Mark[], turn: "X" | "O", ai: "X" | "O", depth: number): number {
  const r = result(b);
  if (r === ai) return 10 - depth;
  if (r === "draw") return 0;
  if (r) return depth - 10;
  const scores = b.flatMap((v, i) => {
    if (v) return [];
    const next = b.slice();
    next[i] = turn;
    return [minimax(next, turn === "X" ? "O" : "X", ai, depth + 1)];
  });
  return turn === ai ? Math.max(...scores) : Math.min(...scores);
}

export function bestMove(b: Mark[], ai: "X" | "O"): number {
  const opp = ai === "X" ? "O" : "X";
  let best = -Infinity;
  let pick = -1;
  b.forEach((v, i) => {
    if (v) return;
    const next = b.slice();
    next[i] = ai;
    const s = minimax(next, opp, ai, 1);
    if (s > best) {
      best = s;
      pick = i;
    }
  });
  return pick;
}

/** "easy" plays randomly most of the time; "hard" never loses. */
export function aiMove(b: Mark[], level: "easy" | "hard", rng: Rng = Math.random): number {
  const open = b.flatMap((v, i) => (v ? [] : [i]));
  if (level === "easy" && rng() < 0.7) return open[Math.floor(rng() * open.length)];
  return bestMove(b, "O");
}
