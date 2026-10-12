import type { Metadata, Viewport } from "next";
import { getSiteProfile } from "@/lib/siteProfileRepo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteProfile();
  return {
    metadataBase: new URL(site.url),
    title: `${site.name} | ${site.role}`,
    description: site.headline,
    openGraph: { title: `${site.name} | ${site.role}`, description: site.headline, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d1020" };

/* Applies saved theme and accent before first paint to avoid a flash. */
const boot = `try{var s=(JSON.parse(localStorage.getItem("folio-os-prefs")||"{}").state)||{};var r=document.documentElement;r.dataset.theme=s.theme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");if(s.accent)r.style.setProperty("--accent",s.accent)}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
