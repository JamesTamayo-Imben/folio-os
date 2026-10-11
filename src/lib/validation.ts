import { z } from "zod";
import { kinds } from "@/data/projects";

/** Remove control characters that have no place in a contact message. */
export const stripControl = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

const clean = (max: number, min: number, minMsg: string, maxMsg: string) =>
  z
    .string({ required_error: minMsg, invalid_type_error: minMsg })
    .transform((s) => stripControl(s).trim())
    .pipe(z.string().min(min, minMsg).max(max, maxMsg));

export const contactSchema = z.object({
  name: clean(80, 2, "Enter your name (at least 2 characters).", "Keep your name under 80 characters."),
  email: z
    .string({ required_error: "Enter your email address." })
    .trim()
    .max(120, "Keep your email under 120 characters.")
    .email("Enter a valid email address, like name@company.com."),
  message: clean(2000, 20, "Add a bit more detail: at least 20 characters.", "Keep the message under 2000 characters."),
  /** Honeypot. Real people never see or fill this field. */
  website: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const projectsQuerySchema = z.object({
  kind: z.enum(kinds as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/* ---------- Comments ---------- */
const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const commentSchema = z.object({
  project: z.string().regex(slugRe, "Pick a valid project.").max(80),
  name: clean(60, 2, "Enter your name (at least 2 characters).", "Keep your name under 60 characters."),
  rating: z.coerce
    .number({ invalid_type_error: "Choose a star rating." })
    .int("Choose a star rating.")
    .min(1, "Choose a star rating.")
    .max(5, "Choose a star rating."),
  body: clean(1000, 5, "Write at least a few words (5 characters).", "Keep your comment under 1000 characters."),
  website: z.string().optional(), // honeypot
});
export type CommentInput = z.infer<typeof commentSchema>;

export const commentsQuerySchema = z.object({
  project: z.string().regex(slugRe).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/* ---------- Admin: projects ---------- */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #4b57d6.");
const url = z.string().url().max(500).refine((u) => u.startsWith("https://"), "Image URLs must use https.");

export const projectInputSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Use lowercase letters, numbers and hyphens.").max(80),
  kind: z.enum(kinds as [string, ...string[]]),
  year: z.coerce.number().int().min(1990).max(2100),
  role: z.string().trim().max(120).default(""),
  tools: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  summary: z.string().trim().max(300).default(""),
  problem: z.string().trim().max(2000).default(""),
  process: z.array(z.object({ title: z.string().trim().min(1).max(100), text: z.string().trim().max(1000) })).max(8).default([]),
  result: z.string().trim().max(1000).default(""),
  palette: z.tuple([hex, hex, hex, hex]),
  shape: z.enum(["rings", "bars", "blob", "grid"]),
  coverUrl: url.nullable().default(null),
  images: z.array(url).max(8).default([]),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(200),
});

/* ---------- v2: references, applications, tracking ---------- */
export const referenceInputSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
  title: z.string().trim().max(120).default(""),
  company: z.string().trim().max(120).default(""),
  quote: z.string().trim().min(1, "Add the quote.").max(400, "Keep the quote under 400 characters."),
  linkUrl: z.string().trim().url("Use a full https link.").max(300).refine((u) => u.startsWith("https://"), "Links must use https.").nullable().or(z.literal("").transform(() => null)).default(null),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});
export type ReferenceInput = z.infer<typeof referenceInputSchema>;

export const STAGES = ["draft", "sent", "viewed", "interview", "offer", "rejected", "closed"] as const;
export const applicationInputSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(slugRe, "Use lowercase letters, numbers and hyphens.").max(80),
  company: z.string().trim().min(1, "Add the company name.").max(80),
  role: z.string().trim().max(80).default(""),
  stage: z.enum(STAGES).default("draft"),
  featuredSlug: z.string().regex(slugRe).max(80).nullable().or(z.literal("").transform(() => null)).default(null),
  note: z.string().trim().max(200, "Keep the greeting under 200 characters.").default(""),
  internalNotes: z.string().trim().max(1000).default(""),
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const EVENT_TYPES = ["view", "project_open", "resume_download", "hire_open", "contact_send", "application_view"] as const;
export const trackSchema = z.object({
  type: z.enum(EVENT_TYPES),
  project: z.string().regex(slugRe).max(80).optional(),
  application: z.string().regex(slugRe).max(80).optional(),
  referrer: z.string().max(100).optional(),
});

export const commentStatusSchema = z.object({ status: z.enum(["pending", "approved"]) });
