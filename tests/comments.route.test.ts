import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/comments/route";
import { __resetMemoryComments } from "@/lib/comments";
import { __resetRateLimit } from "@/lib/rateLimit";

const good = { project: "tideline", name: "Mia Santos", rating: 5, body: "Beautiful, clear case study. Loved the process." };

function post(payload: unknown, headers: Record<string, string> = {}, ip = "1.1.1.1") {
  return POST(
    new Request("http://localhost:3000/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": ip, ...headers },
      body: JSON.stringify(payload),
    }),
  );
}
const get = (qs = "") => GET(new Request(`http://localhost:3000/api/comments${qs}`));

beforeEach(() => {
  __resetMemoryComments();
  __resetRateLimit();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("comments API (in-memory dev store)", () => {
  it("stores a review and lists it with the commenter's name and rating", async () => {
    const res = await post(good);
    expect(res.status).toBe(201);
    const list = await (await get("?project=tideline")).json();
    expect(list.total).toBe(1);
    expect(list.data[0]).toMatchObject({ name: "Mia Santos", rating: 5, projectSlug: "tideline" });
    expect(list.average).toBeNull(); // one review is not enough to show an average
  });

  it("only shows an average once there are at least 3 reviews", async () => {
    await post({ ...good, rating: 5 });
    await post({ ...good, name: "Leo Park", rating: 4 });
    expect((await (await get("?project=tideline")).json()).average).toBeNull();
    await post({ ...good, name: "Ana Cruz", rating: 3 });
    expect((await (await get("?project=tideline")).json()).average).toBe(4);
  });

  it("averages ratings and filters by project", async () => {
    await post({ ...good, rating: 5 });
    await post({ ...good, name: "Leo Park", rating: 4 });
    await post({ ...good, name: "Ivy Tan", rating: 4 });
    await post({ ...good, project: "loop", name: "Ana Cruz", rating: 2 });
    const tideline = await (await get("?project=tideline")).json();
    expect(tideline.total).toBe(3);
    expect(tideline.average).toBe(4.3);
    const all = await (await get()).json();
    expect(all.total).toBe(4);
    expect(all.data.map((c: { name: string }) => c.name)).toContain("Ana Cruz");
  });

  it("allows the general guestbook", async () => {
    expect((await post({ ...good, project: "general" })).status).toBe(201);
  });

  it("rejects a missing rating, short name and tiny comment with field errors", async () => {
    const res = await post({ project: "tideline", name: "A", body: "hi" });
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error.fields.rating).toBeDefined();
    expect(error.fields.name).toBeDefined();
    expect(error.fields.body).toBeDefined();
  });

  it("rejects out-of-range ratings and unknown projects", async () => {
    expect((await post({ ...good, rating: 6 })).status).toBe(422);
    expect((await post({ ...good, rating: 0 })).status).toBe(422);
    expect((await post({ ...good, project: "does-not-exist" })).status).toBe(422);
  });

  it("silently drops honeypot submissions", async () => {
    expect((await post({ ...good, website: "http://spam" })).status).toBe(201);
    expect((await (await get()).json()).total).toBe(0);
  });

  it("blocks cross-origin posts and rate limits repeat posters", async () => {
    expect((await post(good, { origin: "https://evil.example" })).status).toBe(403);
    for (let i = 0; i < 5; i++) expect((await post(good, {}, "7.7.7.7")).status).toBe(201);
    const limited = await post(good, {}, "7.7.7.7");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("stores comment text as plain text (no HTML interpretation happens server-side)", async () => {
    await post({ ...good, body: "<script>alert(1)</script> nice work" });
    const list = await (await get()).json();
    expect(list.data[0].body).toContain("<script>"); // returned as data; React escapes it on render
  });

  it("validates pagination parameters", async () => {
    expect((await get("?limit=999")).status).toBe(422);
    expect((await get("?project=Not A Slug")).status).toBe(422);
  });
});
