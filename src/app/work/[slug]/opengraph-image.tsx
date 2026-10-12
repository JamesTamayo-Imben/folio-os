import { ImageResponse } from "next/og";
import { getPublishedProjects } from "@/lib/projectsRepo";
import { getSiteProfile } from "@/lib/siteProfileRepo";

export const alt = "Case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [projects, site] = await Promise.all([getPublishedProjects(), getSiteProfile()]);
  const p = projects.find((x) => x.slug === slug);
  const [a, b, c, base] = p?.palette ?? ["#6c7bff", "#ff7a6b", "#4fd6b0", "#0d1020"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: base, color: "#fff", padding: 72, flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ position: "absolute", top: -160, left: -60, width: 620, height: 620, borderRadius: 310, background: a, opacity: 0.8, display: "flex" }} />
        <div style={{ position: "absolute", top: -80, right: -120, width: 560, height: 560, borderRadius: 280, background: b, opacity: 0.7, display: "flex" }} />
        <div style={{ position: "absolute", bottom: -240, left: 380, width: 640, height: 640, borderRadius: 320, background: c, opacity: 0.6, display: "flex" }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "rgba(8,10,24,0.38)" }} />
        <div style={{ display: "flex", fontSize: 30, marginBottom: 14, opacity: 0.9 }}>{p ? `${p.kind} \u00B7 ${p.year}` : "Case study"}</div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{p?.title ?? site.name}</div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 20, opacity: 0.92 }}>{`${site.name} \u00B7 ${site.role}`}</div>
      </div>
    ),
    size,
  );
}
