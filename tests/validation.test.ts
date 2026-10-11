import { describe, expect, it } from "vitest";
import { contactSchema, projectsQuerySchema, stripControl } from "@/lib/validation";

const valid = { name: "Ana Reyes", email: "ana@studio.com", message: "I would love to talk about a branding project." };

describe("contactSchema", () => {
  it("accepts a valid message and trims whitespace", () => {
    const r = contactSchema.parse({ ...valid, name: "  Ana Reyes  " });
    expect(r.name).toBe("Ana Reyes");
  });
  it("rejects a short name, bad email and short message with field errors", () => {
    const r = contactSchema.safeParse({ name: "A", email: "nope", message: "too short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = r.error.flatten().fieldErrors;
      expect(f.name?.[0]).toMatch(/at least 2/);
      expect(f.email?.[0]).toMatch(/valid email/);
      expect(f.message?.[0]).toMatch(/at least 20/);
    }
  });
  it("rejects over-long messages", () => {
    expect(contactSchema.safeParse({ ...valid, message: "x".repeat(2001) }).success).toBe(false);
  });
  it("strips control characters", () => {
    expect(stripControl("hi\u0000 there\u0007")).toBe("hi there");
  });
});

describe("projectsQuerySchema", () => {
  it("applies defaults", () => {
    expect(projectsQuerySchema.parse({})).toEqual({ page: 1, limit: 12 });
  });
  it("rejects unknown kinds and oversized limits", () => {
    expect(projectsQuerySchema.safeParse({ kind: "Sculpture" }).success).toBe(false);
    expect(projectsQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
  });
});

import { commentSchema, projectInputSchema } from "@/lib/validation";
import { sniffImage } from "@/lib/image";
import { rowToProject } from "@/lib/projectsRepo";

describe("commentSchema", () => {
  const ok = { project: "tideline", name: "Mia", rating: 4, body: "Really nice work here." };
  it("accepts a valid comment and coerces a numeric string rating", () => {
    expect(commentSchema.parse({ ...ok, rating: "4" }).rating).toBe(4);
  });
  it("rejects fractional and out-of-range ratings", () => {
    expect(commentSchema.safeParse({ ...ok, rating: 3.5 }).success).toBe(false);
    expect(commentSchema.safeParse({ ...ok, rating: 7 }).success).toBe(false);
  });
});

describe("projectInputSchema", () => {
  it("fills sensible defaults for optional fields", () => {
    const p = projectInputSchema.parse({ title: "T", slug: "t", kind: "Motion", year: 2025, palette: ["#000000", "#111111", "#222222", "#333333"], shape: "grid" });
    expect(p).toMatchObject({ published: true, images: [], tools: [], coverUrl: null, sortOrder: 0 });
  });
});

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP and refuses everything else", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))?.ext).toBe("png");
    expect(sniffImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext).toBe("webp");
    expect(sniffImage(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});

describe("rowToProject", () => {
  it("maps database columns and repairs a malformed palette", () => {
    const p = rowToProject({ id: "1", slug: "a", title: "A", kind: "Motion", year: 2024, palette: ["#fff"], shape: "grid", cover_url: "https://x/y.png", sort_order: 3, published: true });
    expect(p.coverUrl).toBe("https://x/y.png");
    expect(p.sortOrder).toBe(3);
    expect(p.palette).toHaveLength(4);
  });
});
