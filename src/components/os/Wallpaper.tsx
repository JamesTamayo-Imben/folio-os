"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { Palette } from "@/data/projects";
import { usePrefs } from "@/lib/store";
import { coverBackground, projectBackground } from "./CoverArt";
import { useProjects } from "./projects-context";

export const defaultPalette: Palette = ["#4b57d6", "#c4478f", "#1a8f9a", "#0d1020"];

export function Wallpaper({ mounted }: { mounted: boolean }) {
  const id = usePrefs((s) => s.wallpaper);
  const projects = useProjects();
  const project = mounted ? projects.find((p) => p.slug === id) : undefined;
  const key = project ? project.slug : "default";
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={key}
        className="wallpaper"
        style={{ background: project ? projectBackground(project) : coverBackground(defaultPalette) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        aria-hidden="true"
      />
    </AnimatePresence>
  );
}
