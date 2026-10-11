"use client";
import { useEffect, useRef, useState } from "react";
import { createBoard, flagsUsed, isWon, reveal, toggleFlag, type MsBoard } from "@/lib/games/minesweeper";
import { useScores } from "@/lib/store";
import { Icon } from "../os/Icon";

const ROWS = 9;
const COLS = 9;
const MINES = 10;
type Status = "idle" | "playing" | "won" | "lost";

export function Minesweeper() {
  const [board, setBoard] = useState<MsBoard>(() => createBoard(ROWS, COLS, MINES));
  const [status, setStatus] = useState<Status>("idle");
  const [secs, setSecs] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const best = useScores((s) => s.best.mines);
  const record = useScores((s) => s.record);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; long: boolean }>({ timer: null, long: false });

  useEffect(() => {
    if (status !== "playing") return;
    const t = setInterval(() => setSecs((s) => Math.min(999, s + 1)), 1000);
    return () => clearInterval(t);
  }, [status]);

  const reset = () => {
    setBoard(createBoard(ROWS, COLS, MINES));
    setStatus("idle");
    setSecs(0);
  };

  const open = (i: number) => {
    if (status === "won" || status === "lost") return;
    const r = reveal(board, i);
    setBoard(r.board);
    if (r.hitMine) setStatus("lost");
    else if (isWon(r.board)) {
      setStatus("won");
      record("mines", secs, "min");
    } else setStatus("playing");
  };

  const flag = (i: number) => {
    if (status === "won" || status === "lost" || !board.started) return;
    setBoard((b) => toggleFlag(b, i));
  };

  const onClick = (i: number) => {
    if (press.current.long) {
      press.current.long = false;
      return;
    }
    if (flagMode) flag(i);
    else open(i);
  };

  const onPointerDown = (e: React.PointerEvent, i: number) => {
    if (e.pointerType !== "touch") return;
    press.current.long = false;
    press.current.timer = setTimeout(() => {
      press.current.long = true;
      flag(i);
    }, 450);
  };
  const cancelPress = () => press.current.timer && clearTimeout(press.current.timer);

  const left = MINES - flagsUsed(board);
  const label = (i: number) => {
    const c = board.cells[i];
    const pos = `Row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`;
    if (c.flagged) return `${pos}, flagged`;
    if (!c.revealed) return `${pos}, hidden`;
    return c.mine ? `${pos}, mine` : `${pos}, ${c.adj || "no"} adjacent mines`;
  };

  return (
    <div className="game">
      <div className="game-bar">
        <span aria-label={`${left} mines left`}><Icon name="flag" size={14} /> <strong>{left}</strong></span>
        <span aria-label={`${secs} seconds`}><strong>{secs}s</strong></span>
        <span className="dim">Best {best !== undefined ? `${best}s` : "none"}</span>
        <button className="btn btn-quiet btn-sm" onClick={reset}>New game</button>
      </div>
      <div className="game-stage ms-stage">
        <div className="ms" role="grid" aria-label="Minesweeper board">
          {board.cells.map((c, i) => (
            <button
              key={i}
              role="gridcell"
              className={`ms-cell ${c.revealed ? "open" : ""} ${c.revealed && c.mine ? "mine" : ""} ${c.revealed && c.adj ? `n${c.adj}` : ""}`}
              aria-label={label(i)}
              onClick={() => onClick(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                flag(i);
              }}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
            >
              {c.flagged ? <Icon name="flag" size={16} /> : c.revealed ? (c.mine ? "\u2736" : c.adj || "") : ""}
            </button>
          ))}
        </div>
        {(status === "won" || status === "lost") && (
          <div className="game-overlay" role="status">
            <strong>{status === "won" ? "Cleared!" : "Boom"}</strong>
            <span>{status === "won" ? `Finished in ${secs} seconds.` : "You hit a mine."}</span>
            <button className="btn" onClick={reset}>Play again</button>
          </div>
        )}
      </div>
      <div className="row game-row">
        <button className="btn btn-quiet btn-sm" aria-pressed={flagMode} onClick={() => setFlagMode((f) => !f)}>
          <Icon name="flag" size={14} /> Flag mode {flagMode ? "on" : "off"}
        </button>
      </div>
      <p className="dim small game-help">Click to reveal. Right-click, long-press or use flag mode to place a flag. Your first click is always safe.</p>
    </div>
  );
}
