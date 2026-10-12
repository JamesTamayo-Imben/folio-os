"use client";
import type { Win } from "@/lib/store";
import { Game2048 } from "../games/Game2048";
import { MemoryMatch } from "../games/MemoryMatch";
import { Minesweeper } from "../games/Minesweeper";
import { Snake } from "../games/Snake";
import { TicTacToe } from "../games/TicTacToe";
import { About } from "./About";
import { GamesHub } from "./GamesHub";
import { Hire } from "./Hire";
import { CaseStudy } from "./CaseStudy";
import { Mail } from "./Mail";
import { Personalize } from "./Personalize";
import { RecycleBin } from "./RecycleBin";
import { Reviews } from "./Reviews";
import { Terminal } from "./Terminal";
import { Work } from "./Work";
import { Notepad } from "./Notepad";
import { Draw } from "./Draw";
import { JourneyGallery } from "./JourneyGallery";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { Calculator } from "./Calculator";
import { Camera } from "./Camera";
import type { JourneyPhoto } from "@/lib/portfolio-content";

export function AppBody({ win, journeyPhotos = [], unavailableDates = [], weeklyUnavailableDays = [], monthlyUnavailableDays = [] }: { win: Win; journeyPhotos?: JourneyPhoto[]; unavailableDates?: string[]; weeklyUnavailableDays?: number[]; monthlyUnavailableDays?: number[] }) {
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
    case "games": return <GamesHub />;
    case "snake": return <Snake />;
    case "g2048": return <Game2048 />;
    case "mines": return <Minesweeper />;
    case "memory": return <MemoryMatch />;
    case "ttt": return <TicTacToe />;
    case "notepad": return <Notepad />;
    case "draw": return <Draw />;
    case "gallery": return <JourneyGallery photos={journeyPhotos} />;
    case "calendar": return <AvailabilityCalendar unavailableDates={unavailableDates} weeklyUnavailableDays={weeklyUnavailableDays} monthlyUnavailableDays={monthlyUnavailableDays} />;
    case "calculator": return <Calculator />;
    case "camera": return <Camera />;
  }
}
