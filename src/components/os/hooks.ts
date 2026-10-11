"use client";
import { useEffect, useState } from "react";

export function useMedia(query: string, initial = false) {
  const [match, setMatch] = useState(initial);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

export const useIsMobile = () => useMedia("(max-width: 767px)");
export const useIsCoarse = () => useMedia("(pointer: coarse)");

/** Current time, ticking every 20 seconds. Null until mounted to avoid hydration mismatch. */
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
