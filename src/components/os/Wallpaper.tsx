"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { Palette } from "@/data/projects";
import { usePrefs } from "@/lib/store";
import { coverBackground, projectBackground } from "./CoverArt";
import { useProjects } from "./projects-context";

export const defaultPalette: Palette = ["#111111", "#090909", "#1d1d1d", "#000000"];

export function Wallpaper({ mounted }: { mounted: boolean }) {
  const id = usePrefs((s) => s.wallpaper);
  const projects = useProjects();
  const customColor = /^color:(#[\da-f]{3}|#[\da-f]{6})$/i.exec(id)?.[1];
  const uploadedImage = /^image:(data:image\/(?:jpeg|png|webp);base64,[\da-z+/=]+)$/i.exec(id)?.[1];
  const project = mounted && !customColor ? projects.find((p) => p.slug === id) : undefined;
  const key = customColor || uploadedImage ? id : project ? project.slug : "default";
  const background = uploadedImage
    ? `url("${uploadedImage}") center / cover no-repeat`
    : customColor ?? (project ? projectBackground(project) : coverBackground(defaultPalette));
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={key}
        className="wallpaper"
        style={{ background }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        aria-hidden="true"
      />
    </AnimatePresence>
  );
}
