"use client";
import { createContext, useContext } from "react";
import { site, type SiteProfile } from "@/config/site";

const SiteProfileContext = createContext<SiteProfile>(site);

export function SiteProfileProvider({ profile, children }: { profile: SiteProfile; children: React.ReactNode }) {
  return <SiteProfileContext.Provider value={profile}>{children}</SiteProfileContext.Provider>;
}

export const useSiteProfile = () => useContext(SiteProfileContext);
export const profileInitials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();