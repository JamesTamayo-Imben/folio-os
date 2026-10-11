import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserted: null as null | Record<string, unknown>,
  updated: null as null | Record<string, unknown>,
  filters: [] as [string, unknown][],
  rows: [] as Record<string, unknown>[],
  admin: null as null | { email: string },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAdmin: async () => state.admin }));
vi.mock("@/lib/supabase/clients", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.insert = (row: Record<string, unknown>) => ((state.inserted = row), c);
    c.update = (row: Record<string, unknown>) => ((state.updated = row), c);
    c.eq = (col: string, v: unknown) => (state.filters.push([col, v]), c);
    for (const m of ["select", "order", "range", "limit", "delete"]) c[m] = () => c;
    c.single = async () => ({ data: { id: "c1", project_slug: "tideline", name: "Mia", rating: 5, body: "Great work here", status: state.inserted?.status ?? "approved", created_at: new Date().toISOString() }, error: null });
    c.maybeSingle = async () => ({ data: { id: "c1" }, error: null });
    c.then = (res: (v: unknown) => unknown) => res({ data: state.rows, error: null, count: state.rows.length });
    return c;
  };
  return { publicClient: () => ({ from: chain }), serviceClient: () => ({ from: chain }), sessionClient: async () => ({}) };
});

import { PATCH } from "@/app/api/admin/comments/[id]/route";
import { POST } from "@/app/api/comments/route";
import { addComment, listComments, moderationOn } from "@/lib/comments";
import { __resetRateLimit } from "@/lib/rateLimit";

const good = { project: "general", name: "Mia Santos", rating: 5, body: "Beautiful, clear case study. Loved the process." };
const UUID = "5f3b8f2e-7c1a-4d55-9f0e-0b6f5b5d2a11";

function configure() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.ADMIN_EMAIL = "me@example.com";
}

beforeEach(() => {
  __resetRateLimit();
  Object.assign(state, { inserted: null, updated: null, filters: [], rows: [], admin: null });
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL", "COMMENTS_MODERATION"]) delete process.env[k];
  configure();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("feedback moderation (Supabase mode)", () => {
  it("holds new feedback as pending by default", async () => {
    expect(moderationOn()).toBe(true);
    await addComment({ project: "general", name: "Mia", rating: 5, body: "Great work here" });
    expect(state.inserted?.status).toBe("pending");
  });

  it("can be switched off with COMMENTS_MODERATION=off", async () => {
    process.env.COMMENTS_MODERATION = "off";
    await addComment({ project: "general", name: "Mia", rating: 5, body: "Great work here" });
    expect(state.inserted?.status).toBe("approved");
  });

  it("the public API says the comment is pending and does not echo it back", async () => {
    const res = await POST(new Request("http://localhost:3000/api/comments", { method: "POST", headers: { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": "3.3.3.3" }, body: JSON.stringify(good) }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.pending).toBe(true);
    expect(json.comment).toBeUndefined();
  });

  it("public listing only asks for approved comments", async () => {
    await listComments({ page: 1, limit: 10 });
    expect(state.filters).toContainEqual(["status", "approved"]);
  });

  it("the admin can approve a comment, and nobody else can", async () => {
    const req = (body: unknown) => new Request("http://localhost:3000/api/admin/comments/x", { method: "PATCH", headers: { "content-type": "application/json", host: "localhost:3000" }, body: JSON.stringify(body) });
    const ctx = { params: Promise.resolve({ id: UUID }) };
    expect((await PATCH(req({ status: "approved" }), ctx)).status).toBe(401);
    state.admin = { email: "me@example.com" };
    expect((await PATCH(req({ status: "published" }), ctx)).status).toBe(422);
    const ok = await PATCH(req({ status: "approved" }), ctx);
    expect(ok.status).toBe(200);
    expect(state.updated).toEqual({ status: "approved" });
  });
});
