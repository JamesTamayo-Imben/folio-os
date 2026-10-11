"use client";
import { useEffect, useRef, useState } from "react";
import { aiMove, result, winningLine, type Mark } from "@/lib/games/tictactoe";
import { useScores } from "@/lib/store";

export function TicTacToe() {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [level, setLevel] = useState<"easy" | "hard">("hard");
  const scores = useScores((s) => s.best);
  const add = useScores((s) => s.add);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const res = result(board);
  const line = winningLine(board);
  const myTurn = !res && board.filter(Boolean).length % 2 === 0;

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const settle = (b: Mark[]) => {
    const r = result(b);
    if (r === "X") add("ttt-win");
    else if (r === "O") add("ttt-loss");
    else if (r === "draw") add("ttt-draw");
  };

  const play = (i: number) => {
    if (!myTurn || board[i]) return;
    const b = board.slice();
    b[i] = "X";
    setBoard(b);
    if (result(b)) return settle(b);
    timer.current = setTimeout(() => {
      const c = b.slice();
      c[aiMove(c, level)] = "O";
      setBoard(c);
      settle(c);
    }, 350);
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setBoard(Array(9).fill(null));
  };

  const status = res === "X" ? "You win!" : res === "O" ? "The computer wins." : res === "draw" ? "It is a draw." : myTurn ? "Your move (X)" : "Computer is thinking...";

  return (
    <div className="game">
      <div className="game-bar">
        <span>W <strong>{scores["ttt-win"] ?? 0}</strong> D <strong>{scores["ttt-draw"] ?? 0}</strong> L <strong>{scores["ttt-loss"] ?? 0}</strong></span>
        <div className="seg seg-sm" role="radiogroup" aria-label="Difficulty">
          {(["easy", "hard"] as const).map((l) => (
            <button key={l} role="radio" aria-checked={level === l} className="seg-btn" onClick={() => { setLevel(l); reset(); }}>
              {l === "easy" ? "Easy" : "Hard"}
            </button>
          ))}
        </div>
      </div>
      <div className="game-stage ttt-stage">
        <div className="ttt" role="grid" aria-label="Tic-tac-toe board">
          {board.map((m, i) => (
            <button key={i} role="gridcell" className={`ttt-cell ${line?.includes(i) ? "win" : ""} ${m === "O" ? "o" : ""}`} onClick={() => play(i)} aria-label={`Square ${i + 1}, ${m ?? "empty"}`} disabled={!!m || !myTurn}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <p className="game-status" role="status">{status}</p>
      <div className="row game-row"><button className="btn" onClick={reset}>New game</button></div>
      <p className="dim small game-help">Hard mode never loses. A draw is the best you can do.</p>
    </div>
  );
}
