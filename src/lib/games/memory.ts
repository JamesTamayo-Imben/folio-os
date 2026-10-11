import type { Rng } from "./game2048";

export const SYMBOLS = ["circle", "square", "triangle", "diamond", "star", "hexagon", "cross", "heart"] as const;
export type Symbol = (typeof SYMBOLS)[number];
export interface MemCard { id: number; symbol: Symbol }

export function makeDeck(rng: Rng = Math.random): MemCard[] {
  const deck = [...SYMBOLS, ...SYMBOLS].map((symbol, id) => ({ id, symbol }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
