"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { canTurn, createSnake, step, type Dir } from "@/lib/games/snake";
import { useScores } from "@/lib/store";
import { useIsCoarse } from "../os/hooks";
import { Icon } from "../os/Icon";
import { useGameKeys, useSwipe, useWindowFocused } from "./useGame";

const COLS = 20;
const ROWS = 20;
const CELL = 20;
const KEYS: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };

type Status = "ready" | "playing" | "paused" | "over";

export function Snake() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef(createSnake(COLS, ROWS));
  const queue = useRef<Dir[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const best = useScores((s) => s.best.snake ?? 0);
  const record = useScores((s) => s.record);
  const focused = useWindowFocused("snake");
  const coarse = useIsCoarse();

  const draw = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const css = getComputedStyle(c);
    const accent = css.getPropertyValue("--accent").trim() || "#6c7bff";
    const text = css.getPropertyValue("--text").trim() || "#fff";
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(127,135,170,0.14)";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    const g = game.current;
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL * 0.36, 0, Math.PI * 2);
    ctx.fill();
    g.snake.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? text : accent;
      ctx.beginPath();
      ctx.roundRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 7 : 5);
      ctx.fill();
    });
  }, []);

  const reset = useCallback(() => {
    game.current = createSnake(COLS, ROWS);
    queue.current = [];
    setScore(0);
    setStatus("ready");
    draw();
  }, [draw]);

  const point = useCallback((d: Dir) => {
    const last = queue.current[queue.current.length - 1] ?? game.current.dir;
    if (d !== last && canTurn(last, d) && queue.current.length < 3) queue.current.push(d);
    setStatus((s) => (s === "ready" || s === "paused" ? "playing" : s));
  }, []);

  useEffect(() => {
    draw();
  }, [draw, status]);

  // Game loop
  useEffect(() => {
    if (status !== "playing") return;
    const t = setInterval(() => {
      const next = step(game.current, queue.current.shift() ?? game.current.dir);
      game.current = next;
      setScore(next.score);
      if (next.dead) {
        setStatus("over");
        record("snake", next.score, "max");
      }
      draw();
    }, 115);
    return () => clearInterval(t);
  }, [status, draw, record]);

  // Pause automatically when the window is not active
  useEffect(() => {
    if (!focused) setStatus((s) => (s === "playing" ? "paused" : s));
  }, [focused]);

  useGameKeys("snake", (e) => {
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (d) {
      e.preventDefault();
      if (status === "over") return;
      point(d);
    } else if (e.key === " ") {
      e.preventDefault();
      if (status === "over") reset();
      else setStatus((s) => (s === "playing" ? "paused" : "playing"));
    } else if (e.key === "Enter" && status === "over") reset();
  });

  const swipe = useSwipe(point);

  return (
    <div className="game">
      <div className="game-bar">
        <span>Score <strong>{score}</strong></span>
        <span className="dim">Best {best}</span>
        <button className="btn btn-quiet btn-sm" onClick={reset}>New game</button>
      </div>
      <div className="game-stage" {...swipe}>
        <canvas ref={canvas} width={COLS * CELL} height={ROWS * CELL} className="snake-canvas" role="img" aria-label={`Snake board. Score ${score}.`} />
        {status !== "playing" && (
          <div className="game-overlay" role="status">
            {status === "over" ? <><strong>Game over</strong><span>You scored {score}.</span></> : status === "paused" ? <strong>Paused</strong> : <strong>Ready?</strong>}
            <button className="btn" onClick={() => (status === "over" ? reset() : setStatus("playing"))}>{status === "over" ? "Play again" : status === "paused" ? "Resume" : "Start"}</button>
          </div>
        )}
      </div>
      <p className="dim small game-help">Arrow keys or WASD to steer. Space pauses.{coarse ? " Swipe on the board." : ""}</p>
      {coarse && (
        <div className="dpad" aria-label="Direction controls">
          {(["up", "left", "down", "right"] as Dir[]).map((d) => (
            <button key={d} className={`dpad-${d}`} onClick={() => point(d)} aria-label={`Turn ${d}`}>
              <Icon name="arrow" size={20} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
