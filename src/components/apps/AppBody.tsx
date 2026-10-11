"use client";
import type { Win } from "@/lib/store";
import { Game2048 } from "../games/Game2048";
import { MemoryMatch } from "../games/MemoryMatch";
import { Minesweeper } from "../games/Minesweeper";
import { Snake } from "../games/Snake";
import { TicTacToe } from "../games/TicTacToe";
import { About } from "./About";
import { Hire } from "./Hire";
import { CaseStudy } from "./CaseStudy";
import { Mail } from "./Mail";
import { Personalize } from "./Personalize";
import { RecycleBin } from "./RecycleBin";
import { Reviews } from "./Reviews";
import { Terminal } from "./Terminal";
import { Work } from "./Work";

export function AppBody({ win }: { win: Win }) {
  switch (win.app) {
    case "hire": return <Hire />;
    case "work": return <Work />;
    case "case": return <CaseStudy slug={win.param ?? ""} />;
    case "about": return <About />;
    case "mail": return <Mail />;
    case "terminal": return <Terminal />;
    case "personalize": return <Personalize />;
    case "bin": return <RecycleBin />;
    case "reviews": return <Reviews />;
    case "snake": return <Snake />;
    case "g2048": return <Game2048 />;
    case "mines": return <Minesweeper />;
    case "memory": return <MemoryMatch />;
    case "ttt": return <TicTacToe />;
  }
}
