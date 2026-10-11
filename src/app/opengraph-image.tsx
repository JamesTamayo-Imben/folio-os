import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name}, ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0d1020", color: "#eef1fb", padding: 72, flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ position: "absolute", top: -140, right: -80, width: 560, height: 560, borderRadius: 280, background: "#6c7bff", opacity: 0.55, display: "flex" }} />
        <div style={{ position: "absolute", top: 120, right: 240, width: 300, height: 300, borderRadius: 150, background: "#ff7a6b", opacity: 0.45, display: "flex" }} />
        <div style={{ position: "absolute", bottom: -160, left: -100, width: 460, height: 460, borderRadius: 230, background: "#4fd6b0", opacity: 0.3, display: "flex" }} />
        <div style={{ display: "flex", fontSize: 30, color: "#a9b0c9", marginBottom: 16 }}>{site.role}</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>{site.name}</div>
        <div style={{ display: "flex", fontSize: 34, color: "#cfd5ea", marginTop: 20, maxWidth: 900 }}>{site.headline}</div>
      </div>
    ),
    size,
  );
}
