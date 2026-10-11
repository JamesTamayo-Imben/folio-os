import type { Rng } from "./game2048";

export type Dir = "up" | "down" | "left" | "right";
export interface Pt { x: number; y: number }
export interface SnakeState {
  cols: number;
  rows: number;
  snake: Pt[]; // head first
  dir: Dir;
  food: Pt;
  score: number;
  dead: boolean;
}

const DELTA: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export const canTurn = (current: Dir, next: Dir) => next !== OPPOSITE[current];

export function spawnFood(cols: number, rows: number, snake: Pt[], rng: Rng = Math.random): Pt {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Pt[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!taken.has(`${x},${y}`)) free.push({ x, y });
  return free.length ? free[Math.floor(rng() * free.length)] : { x: -1, y: -1 };
}

export function createSnake(cols = 20, rows = 20, rng: Rng = Math.random): SnakeState {
  const y = Math.floor(rows / 2);
  const snake = [{ x: 6, y }, { x: 5, y }, { x: 4, y }];
  return { cols, rows, snake, dir: "right", food: spawnFood(cols, rows, snake, rng), score: 0, dead: false };
}

export function step(s: SnakeState, wanted: Dir, rng: Rng = Math.random): SnakeState {
  if (s.dead) return s;
  const dir = canTurn(s.dir, wanted) ? wanted : s.dir;
  const d = DELTA[dir];
  const head = { x: s.snake[0].x + d.x, y: s.snake[0].y + d.y };
  const eating = head.x === s.food.x && head.y === s.food.y;
  // The tail moves away this tick unless we are eating, so it is not a collision.
  const body = eating ? s.snake : s.snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= s.cols || head.y >= s.rows;
  const hitSelf = body.some((p) => p.x === head.x && p.y === head.y);
  if (hitWall || hitSelf) return { ...s, dir, dead: true };
  const snake = [head, ...body];
  return { ...s, dir, snake, score: s.score + (eating ? 1 : 0), food: eating ? spawnFood(s.cols, s.rows, snake, rng) : s.food };
}
