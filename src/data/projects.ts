export type Palette = [string, string, string, string]; // three glow colors + base
export type Shape = "rings" | "bars" | "blob" | "grid";
export type Kind = "UI/UX" | "Branding" | "Illustration" | "Motion";

export interface Project {
  /** Present for projects stored in Supabase. */
  id?: string;
  slug: string;
  title: string;
  kind: Kind;
  year: number;
  role: string;
  tools: string[];
  summary: string;
  problem: string;
  process: { title: string; text: string }[];
  result: string;
  palette: Palette;
  shape: Shape;
  /** Optional real cover image (Supabase Storage). Falls back to generated art. */
  coverUrl?: string | null;
  images?: string[];
  published?: boolean;
  sortOrder?: number;
}

/** The first project is real (this site). The other four are SAMPLES: replace them with your own work in the admin. */
export const projects: Project[] = [
  {
    slug: "making-of-folioos",
    title: "Making of FolioOS",
    kind: "UI/UX",
    year: 2026,
    role: "Designer and developer",
    tools: ["Next.js", "TypeScript", "Supabase", "Figma"],
    summary: "This portfolio. A desktop-style interface designed and built end to end, with a recruiter fast lane so the metaphor never gets in the way.",
    problem:
      "Portfolios tend to look alike, and a recruiter may only spend a couple of minutes on each. I wanted something memorable that still lets a busy person judge my work quickly, and that stays usable with a keyboard, a screen reader or a phone.",
    process: [
      { title: "A metaphor with a safety net", text: "Windows, a taskbar and a Start menu make the site memorable. A one-screen Hire me view, always one click away, means nobody has to learn the metaphor to reach the work." },
      { title: "Accessibility as a design requirement", text: "Visible focus rings, keyboard control of every window and game, reduced-motion support, labelled controls, and 44px touch targets. Colors were checked for contrast in both themes." },
      { title: "Every project is a real link", text: "Opening a case study updates the address bar, so each one can be shared, bookmarked and previewed on LinkedIn, and the back button works." },
      { title: "Built so it can be maintained", text: "A private admin manages projects, images, references and feedback. Visitors cannot write to the database directly. Validation, rate limits, admin sign-in, uploads and the game rules are covered by automated tests." },
      { title: "Personalized, not generic", text: "Each application can get its own private link that greets the company by name and opens the most relevant project, so I can see which links were actually opened." },
    ],
    result:
      "A working portfolio with five playable games, star-rated feedback with moderation, a recruiter fast lane, privacy-friendly analytics and printable case studies. Everything on it can be edited without touching code.",
    palette: ["#6c7bff", "#ff7a6b", "#4fd6b0", "#0d1020"],
    shape: "rings",
  },
  {
    slug: "tideline",
    title: "Tideline",
    kind: "UI/UX",
    year: 2026,
    role: "Lead product designer",
    tools: ["Figma", "Principle", "Maze"],
    summary: "A tide and surf companion app that answers one question: should I go out now?",
    problem:
      "Surfers were checking three apps before every session. The data was accurate but scattered, and nobody could read it with wet hands in glare.",
    process: [
      { title: "Interviews and field notes", text: "Eight sessions on beaches, not in meetings. Most people only cared about the next two hours." },
      { title: "One-glance home screen", text: "A single verdict with the three numbers behind it. Everything else is one tap away." },
      { title: "Glare-tested contrast", text: "Prototypes were tested outdoors at noon. Type size and weight were raised until they held up." },
    ],
    result: "Replace this with your real, measured outcome (for example, what changed and by how much).",
    palette: ["#2f6bff", "#18d0c0", "#ff9c6e", "#0b1a3a"],
    shape: "rings",
  },
  {
    slug: "harbor-and-pine",
    title: "Harbor & Pine",
    kind: "Branding",
    year: 2025,
    role: "Brand designer",
    tools: ["Illustrator", "Figma", "InDesign"],
    summary: "A full identity for a small-batch coffee roaster, from logo to bag system.",
    problem: "The roaster had great beans and a forgettable look. Shelf presence in a crowded cafe aisle was the real problem.",
    process: [
      { title: "Naming the voice", text: "Three words guided every decision: salt, resin, steam." },
      { title: "A bag system, not a bag", text: "One layout, six origins. Color and a single illustrated mark change per roast." },
      { title: "Printing in the real world", text: "Two print rounds to get the spot colors right on kraft stock." },
    ],
    result: "Replace this with your real, measured outcome (for example, what changed and by how much).",
    palette: ["#e0573d", "#f2c14e", "#3d7a5f", "#1b2a22"],
    shape: "bars",
  },
  {
    slug: "paper-weather",
    title: "Paper Weather",
    kind: "Illustration",
    year: 2025,
    role: "Illustrator",
    tools: ["Procreate", "Illustrator"],
    summary: "A series of twelve cut-paper style illustrations, one for each month's weather.",
    problem: "A personal project to practice layered shape language without relying on outlines or gradients.",
    process: [
      { title: "Shape library", text: "A kit of 30 shapes, reused across all twelve pieces." },
      { title: "Light from one side", text: "Every piece uses the same shadow direction so the set reads as one world." },
    ],
    result: "Replace this with your real, measured outcome (for example, what changed and by how much).",
    palette: ["#b58cff", "#ff8fb1", "#ffd36e", "#2a1f3d"],
    shape: "blob",
  },
  {
    slug: "loop",
    title: "Loop",
    kind: "Motion",
    year: 2024,
    role: "Motion designer",
    tools: ["After Effects", "Rive", "Figma"],
    summary: "A motion study that turns a city transit map into a looping, readable animation.",
    problem: "Static transit maps are hard to read at a glance. Can motion make the structure clearer instead of busier?",
    process: [
      { title: "Choreographing lines", text: "Each line draws in once, in the order a rider would travel it." },
      { title: "Timing as hierarchy", text: "Interchanges pulse slower than stops, so they read as more important." },
    ],
    result: "Replace this with your real, measured outcome (for example, what changed and by how much).",
    palette: ["#ffc93c", "#ff5d73", "#4f46e5", "#12122b"],
    shape: "grid",
  },
];

export const kinds: Kind[] = ["UI/UX", "Branding", "Illustration", "Motion"];

export const getProject = (slug: string | undefined | null) => projects.find((p) => p.slug === slug);

export interface BinItem {
  title: string;
  why: string;
  palette: Palette;
}

/** The Recycle Bin: rejected directions and what they taught you. */
export const binItems: BinItem[] = [
  { title: "Tideline in neon green", why: "Looked great on a monitor and unreadable in daylight. It is why the final palette is deep blue.", palette: ["#39ff88", "#0b1a3a", "#ffffff", "#07121f"] },
  { title: "Skeuomorphic coffee bags", why: "Too much detail for a 6 cm shelf face. The flat system won.", palette: ["#8b5a2b", "#d9b38c", "#3b2a1a", "#1b130c"] },
  { title: "A 14-icon set nobody could read at 16px", why: "Cut to eight icons and drew them on a 24px grid.", palette: ["#9aa3b2", "#e8ecf3", "#566074", "#10141c"] },
];
