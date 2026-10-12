"use client";
import { useOs } from "@/lib/store";
import { Icon, type IconName } from "../os/Icon";

const GAMES: { app: "snake" | "g2048" | "mines" | "memory" | "ttt"; label: string; icon: IconName }[] = [
  { app: "snake", label: "Snake", icon: "snake" },
  { app: "g2048", label: "2048", icon: "tiles" },
  { app: "mines", label: "Minesweeper", icon: "flag" },
  { app: "memory", label: "Memory Match", icon: "cards" },
  { app: "ttt", label: "Tic-Tac-Toe", icon: "hash" },
];

export function GamesHub() {
  const open = useOs((s) => s.open);

  return (
    <div className="pad">
      <h1 className="about-name">Games</h1>
      <p className="dim">Pick a game to launch it in its own window.</p>
      <div className="games-grid">
        {GAMES.map((game) => (
          <button key={game.app} className="game-card" onClick={() => open(game.app)}>
            <span className="game-card-icon"><Icon name={game.icon} size={28} /></span>
            <span className="game-card-label">{game.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
