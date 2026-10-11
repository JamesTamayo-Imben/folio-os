"use client";
import { useEffect, useRef, useState } from "react";
import { makeDeck, type Symbol } from "@/lib/games/memory";
import { useScores } from "@/lib/store";

const SHAPES: Record<Symbol, { path: string; color: string }> = {
  circle: { path: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z", color: "#ff6b6b" },
  square: { path: "M5 5h14v14H5z", color: "#4f8cff" },
  triangle: { path: "M12 4l9 16H3z", color: "#ffc93c" },
  diamond: { path: "M12 3l9 9-9 9-9-9z", color: "#4fd6b0" },
  star: { path: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", color: "#d58cff" },
  hexagon: { path: "M12 3l8 4.5v9L12 21l-8-4.5v-9z", color: "#ff9c6e" },
  cross: { path: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z", color: "#7ee0ff" },
  heart: { path: "M12 20s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 5.8-8 11-8 11z", color: "#ff7fc0" },
};

export function MemoryMatch() {
  const [deck, setDeck] = useState(() => makeDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const best = useScores((s) => s.best.memory);
  const record = useScores((s) => s.record);
  const done = matched.size === deck.length;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  useEffect(() => {
    if (done) record("memory", moves, "min");
  }, [done, moves, record]);

  const pick = (i: number) => {
    if (lock.current || flipped.includes(i) || matched.has(i) || done) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].symbol === deck[b].symbol) {
        setMatched((m) => new Set([...m, a, b]));
        setFlipped([]);
      } else {
        lock.current = true;
        timer.current = setTimeout(() => {
          setFlipped([]);
          lock.current = false;
        }, 750);
      }
    }
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    lock.current = false;
    setDeck(makeDeck());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
  };

  return (
    <div className="game">
      <div className="game-bar">
        <span>Moves <strong>{moves}</strong></span>
        <span className="dim">Best {best ?? "none"}</span>
        <button className="btn btn-quiet btn-sm" onClick={reset}>New game</button>
      </div>
      <div className="game-stage">
        <div className="mem" role="group" aria-label="Memory cards">
          {deck.map((c, i) => {
            const up = flipped.includes(i) || matched.has(i);
            const s = SHAPES[c.symbol];
            return (
              <button key={c.id} className={`mem-card ${up ? "up" : ""} ${matched.has(i) ? "done" : ""}`} onClick={() => pick(i)} aria-label={up ? `Card ${i + 1}: ${c.symbol}${matched.has(i) ? ", matched" : ""}` : `Card ${i + 1}, face down`}>
                {up && (
                  <svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true">
                    <path d={s.path} fill={s.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {done && (
          <div className="game-overlay" role="status">
            <strong>All pairs found!</strong>
            <span>{moves} moves.</span>
            <button className="btn" onClick={reset}>Play again</button>
          </div>
        )}
      </div>
      <p className="dim small game-help">Flip two cards. Match all eight pairs in as few moves as you can.</p>
    </div>
  );
}
