"use client";
import { useCallback, useState } from "react";
import { canMove, addRandom, move, newBoard, hasWon, type Board, type Dir } from "@/lib/games/game2048";
import { useScores } from "@/lib/store";
import { useGameKeys, useSwipe } from "./useGame";

const KEYS: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };

export function Game2048() {
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [score, setScore] = useState(0);
  const [keepGoing, setKeepGoing] = useState(false);
  const best = useScores((s) => s.best.g2048 ?? 0);
  const record = useScores((s) => s.record);

  const over = !canMove(board);
  const won = hasWon(board) && !keepGoing;

  const slide = useCallback(
    (dir: Dir) => {
      if (over || won) return;
      const r = move(board, dir);
      if (!r.moved) return;
      const nextScore = score + r.gained;
      setBoard(addRandom(r.board));
      setScore(nextScore);
      record("g2048", nextScore, "max");
    },
    [board, score, over, won, record],
  );

  useGameKeys("g2048", (e) => {
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (d) {
      e.preventDefault();
      slide(d);
    }
  });
  const swipe = useSwipe(slide);

  const reset = () => {
    setBoard(newBoard());
    setScore(0);
    setKeepGoing(false);
  };

  return (
    <div className="game">
      <div className="game-bar">
        <span>Score <strong>{score}</strong></span>
        <span className="dim">Best {best}</span>
        <button className="btn btn-quiet btn-sm" onClick={reset}>New game</button>
      </div>
      <div className="game-stage g2048" {...swipe} role="group" aria-label="2048 board">
        {board.map((v, i) => (
          <div key={i} className="tile" data-v={v > 2048 ? "big" : v} aria-label={v ? String(v) : "empty"}>
            {v || ""}
          </div>
        ))}
        {(over || won) && (
          <div className="game-overlay" role="status">
            <strong>{won ? "You made 2048!" : "No more moves"}</strong>
            <span>Score {score}</span>
            <div className="row">
              {won && <button className="btn btn-quiet" onClick={() => setKeepGoing(true)}>Keep going</button>}
              <button className="btn" onClick={reset}>New game</button>
            </div>
          </div>
        )}
      </div>
      <p className="dim small game-help">Arrow keys or WASD, or swipe the board. Merge equal tiles to reach 2048.</p>
    </div>
  );
}
