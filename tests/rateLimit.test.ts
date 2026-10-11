import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimit, rateLimit } from "@/lib/rateLimit";

beforeEach(() => __resetRateLimit());

describe("rateLimit", () => {
  const cfg = { limit: 3, windowMs: 60_000 };

  it("allows up to the limit then blocks with a retry time", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("a", { ...cfg, now: 1000 + i }).ok).toBe(true);
    const blocked = rateLimit("a", { ...cfg, now: 2000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
  it("frees capacity after the window passes", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", { ...cfg, now: 1000 });
    expect(rateLimit("a", { ...cfg, now: 1000 + 60_001 }).ok).toBe(true);
  });
  it("tracks keys independently", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", { ...cfg, now: 1000 });
    expect(rateLimit("b", { ...cfg, now: 1000 }).ok).toBe(true);
  });
});
