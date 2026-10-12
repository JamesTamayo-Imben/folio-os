/**
 * Edit this file first. Everything personal lives here.
 */
export const site = {
  name: "James T. Tamayo",
  /** The role you are applying for. Be specific: it is the first thing a recruiter reads. */
  role: "Product Designer",
  /** One sentence that says who you help and how. Shown on the Hire me screen. */
  headline: "I design clear, accessible product experiences, from first research to shipped interface.",
  /** Three short strengths shown as chips on the Hire me screen. */
  highlights: ["Design systems", "Accessible UI", "Design and code fluency"],
  osName: "FolioOS",
  tagline: "Case studies, process and craft, filed in one place.",
  bio: [
    "I design products people use without thinking about them. I like projects where the system and the details both have to be right.",
    "I work closely with engineers and product managers, and I prototype in code when it helps the team decide faster.",
  ],
  skills: ["Product design", "Design systems", "Interaction design", "Accessibility", "Prototyping", "Brand identity"],
  tools: ["Figma", "Illustrator", "Framer", "Next.js"],
  email: "hello@example.com",
  location: "Dasmarinas City, Cavite, Philippines",
  availability: "Open to full-time roles from next month",
  linkedin: "https://www.linkedin.com/",
  /** Optional profile photo URL. Leave blank to fall back to initials. */
  profileImageUrl: "",
  /** Put your résumé at public/resume.pdf (or change this path). */
  resumeUrl: "/resume.pdf",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "Dribbble", href: "https://dribbble.com/" },
    { label: "Behance", href: "https://www.behance.net/" },
  ],
  /** Opens automatically after the lock screen. Must match a project slug. */
  featuredSlug: "making-of-folioos",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type SiteProfile = {
  name: string;
  role: string;
  headline: string;
  highlights: readonly string[];
  osName: string;
  tagline: string;
  bio: readonly string[];
  skills: readonly string[];
  tools: readonly string[];
  email: string;
  location: string;
  availability: string;
  linkedin: string;
  profileImageUrl: string;
  resumeUrl: string;
  socials: readonly { label: string; href: string }[];
  featuredSlug: string;
  url: string;
};

/** Ratings stay hidden until this many approved reviews exist, so one early review cannot define you. */
export const MIN_RATINGS_FOR_AVERAGE = 3;

export const initials = site.name
  .split(" ")
  .map((p) => p[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();
