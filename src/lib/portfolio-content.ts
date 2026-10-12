import { z } from "zod";
import { hasPublicSupabase } from "./supabase/config";
import { publicClient } from "./supabase/clients";

const httpsImageUrl = z.string().trim().url().max(500).refine((value) => value.startsWith("https://"), "Journey image URLs must use https.");
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid calendar date.");

export const journeyPhotosSchema = z.array(z.object({ url: httpsImageUrl, caption: z.string().trim().max(160).default("") })).max(24);
export const unavailableDatesSchema = z.array(calendarDate).max(180).transform((dates) => [...new Set(dates)].sort());
export const weeklyUnavailableDaysSchema = z.array(z.number().int().min(0).max(6)).max(7).transform((days) => [...new Set(days)].sort((a, b) => a - b));
export const monthlyUnavailableDaysSchema = z.array(z.number().int().min(1).max(31)).max(31).transform((days) => [...new Set(days)].sort((a, b) => a - b));

export type JourneyPhoto = z.infer<typeof journeyPhotosSchema>[number];
export type PortfolioContent = { journeyPhotos: JourneyPhoto[]; unavailableDates: string[]; weeklyUnavailableDays: number[]; monthlyUnavailableDays: number[] };

const EMPTY_CONTENT: PortfolioContent = { journeyPhotos: [], unavailableDates: [], weeklyUnavailableDays: [], monthlyUnavailableDays: [] };

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToPortfolioContent(row: any): PortfolioContent {
  const photos = journeyPhotosSchema.safeParse(row?.journey_photos ?? []);
  const unavailable = unavailableDatesSchema.safeParse(row?.unavailable_dates ?? []);
  const weekly = weeklyUnavailableDaysSchema.safeParse(row?.weekly_unavailable_days ?? []);
  const monthly = monthlyUnavailableDaysSchema.safeParse(row?.monthly_unavailable_days ?? []);
  return {
    journeyPhotos: photos.success ? photos.data : [],
    unavailableDates: unavailable.success ? unavailable.data : [],
    weeklyUnavailableDays: weekly.success ? weekly.data : [],
    monthlyUnavailableDays: monthly.success ? monthly.data : [],
  };
}

export async function getPublicPortfolioContent(): Promise<PortfolioContent> {
  if (!hasPublicSupabase()) return EMPTY_CONTENT;
  try {
    const { data, error } = await publicClient().from("site_portfolio_content").select("journey_photos,unavailable_dates,weekly_unavailable_days,monthly_unavailable_days").eq("id", true).maybeSingle();
    if (error) throw error;
    return rowToPortfolioContent(data);
  } catch {
    return EMPTY_CONTENT;
  }
}
