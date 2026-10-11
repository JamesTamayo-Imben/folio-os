import { describe, expect, it } from "vitest";
import { addRandom, canMove, move, newBoard, slideLine } from "@/lib/games/game2048";
import { createBoard, flagsUsed, isWon, neighbors, reveal, toggleFlag } from "@/lib/games/minesweeper";
import { createSnake, step } from "@/lib/games/snake";
import { aiMove, bestMove, result, winningLine } from "@/lib/games/tictactoe";
import { makeDeck } from "@/lib/games/memory";

const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("2048", () => {
  it("merges each pair once and packs left", () => {
    expect(slideLine([2, 2, 2, 2]).line).toEqual([4, 4, 0, 0]);
    expect(slideLine([2, 2, 4, 0]).line).toEqual([4, 4, 0, 0]);
    expect(slideLine([4, 0, 2, 2]).line).toEqual([4, 4, 0, 0]);
    expect(slideLine([2, 2, 2, 0])).toMatchObject({ line: [4, 2, 0, 0], gained: 4 });
  });
  it("reports no movement when nothing changes", () => {
    expect(slideLine([2, 4, 8, 16]).moved).toBe(false);
  });
  it("moves in all four directions", () => {
    const b = [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(move(b, "left").board.slice(0, 4)).toEqual([4, 0, 0, 0]);
    expect(move(b, "right").board.slice(0, 4)).toEqual([0, 0, 0, 4]);
    const col = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(move(col, "up").board[0]).toBe(4);
    expect(move(col, "down").board[12]).toBe(4);
  });
  it("starts with two tiles and detects a dead board", () => {
    expect(newBoard().filter(Boolean)).toHaveLength(2);
    const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(canMove(stuck)).toBe(false);
    expect(addRandom(stuck)).toBe(stuck);
  });
});

describe("minesweeper", () => {
  it("never puts a mine on or next to the first click, and counts neighbors", () => {
    const b = createBoard(9, 9, 10);
    const { board } = reveal(b, 40);
    expect(board.cells.filter((c) => c.mine)).toHaveLength(10);
    [40, ...neighbors(b, 40)].forEach((i) => expect(board.cells[i].mine).toBe(false));
    board.cells.forEach((c, i) => expect(c.adj).toBe(neighbors(board, i).filter((n) => board.cells[n].mine).length));
  });
  it("floods open an empty area and wins when all safe cells are revealed", () => {
    const { board } = reveal(createBoard(9, 9, 1), 0);
    expect(board.cells.filter((c) => c.revealed).length).toBeGreaterThan(40);
    let b = board;
    b.cells.forEach((c, i) => {
      if (!c.mine && !c.revealed) b = reveal(b, i).board;
    });
    expect(isWon(b)).toBe(true);
  });
  it("reports a mine hit and does not reveal flagged cells", () => {
    const { board } = reveal(createBoard(5, 5, 5), 12);
    const mineIdx = board.cells.findIndex((c) => c.mine);
    const flagged = toggleFlag(board, mineIdx);
    expect(flagsUsed(flagged)).toBe(1);
    expect(reveal(flagged, mineIdx).hitMine).toBe(false);
    expect(reveal(board, mineIdx).hitMine).toBe(true);
  });
});

describe("tic-tac-toe", () => {
  it("detects wins and draws", () => {
    expect(result(["X", "X", "X", null, "O", "O", null, null, null])).toBe("X");
    expect(winningLine(["O", null, null, "O", null, null, "O", null, null])).toEqual([0, 3, 6]);
    expect(result(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).toBe("draw");
  });
  it("takes a win and blocks a loss", () => {
    expect(bestMove(["O", "O", null, "X", "X", null, null, null, null], "O")).toBe(2);
    expect(bestMove(["X", "X", null, null, "O", null, null, null, null], "O")).toBe(2);
  });
  it("the hard AI never loses against any sequence of player moves", () => {
    const play = (b: ("X" | "O" | null)[]): boolean => {
      const r = result(b);
      if (r) return r !== "X";
      return b.every((v, i) => {
        if (v) return true;
        const next = b.slice();
        next[i] = "X";
        const r2 = result(next);
        if (r2) return r2 !== "X";
        const ai = aiMove(next, "hard");
        next[ai] = "O";
        return play(next);
      });
    };
    expect(play(Array(9).fill(null))).toBe(true);
  });
});

describe("snake", () => {
  it("moves, grows when eating, and ignores a 180 degree turn", () => {
    let s = createSnake(20, 20, () => 0);
    const head = s.snake[0];
    s = step(s, "left", () => 0); // reverse is ignored
    expect(s.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    const len = s.snake.length;
    s = { ...s, food: { x: s.snake[0].x + 1, y: s.snake[0].y } };
    s = step(s, "right", seq(0.5));
    expect(s.snake).toHaveLength(len + 1);
    expect(s.score).toBe(1);
  });
  it("dies on walls and on itself", () => {
    let s = createSnake(20, 20);
    s = { ...s, snake: [{ x: 19, y: 5 }, { x: 18, y: 5 }], dir: "right" };
    expect(step(s, "right").dead).toBe(true);
    const loop = { ...createSnake(20, 20), snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 }], dir: "up" as const };
    expect(step(loop, "right").dead).toBe(true);
  });
});

describe("memory", () => {
  it("builds a shuffled deck of 8 pairs", () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(16);
    const counts = deck.reduce<Record<string, number>>((m, c) => ((m[c.symbol] = (m[c.symbol] ?? 0) + 1), m), {});
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
  });
});
