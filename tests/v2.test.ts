import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: null as null | { email: string },
  result: { data: null as unknown, error: null as null | { code?: string } },
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  rpcs: [] as { fn: string; args: unknown }[],
  greetingRow: null as null | Record<string, unknown>,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAdmin: async () => state.admin }));
vi.mock("@/lib/supabase/clients", () => {
  const chain = (table: string) => {
    const c: Record<string, unknown> = {};
    c.insert = (row: Record<string, unknown>) => (state.inserts.push({ table, row }), c);
    for (const m of ["update", "delete", "eq", "select", "order", "limit", "gte"]) c[m] = () => c;
    c.single = async () => state.result;
    c.maybeSingle = async () => (table === "applications" && state.greetingRow ? { data: state.greetingRow, error: null } : state.result);
    c.then = (res: (v: unknown) => unknown) => res(state.result);
    return c;
  };
  const client = { from: chain, rpc: async (fn: string, args: unknown) => (state.rpcs.push({ fn, args }), { error: null }) };
  return { publicClient: () => client, serviceClient: () => client, sessionClient: async () => ({}) };
});

import { GET as listRefs, POST as createRef } from "@/app/api/admin/references/route";
import { GET as listApps, POST as createApp } from "@/app/api/admin/applications/route";
import { PUT as updateApp, DELETE as deleteApp } from "@/app/api/admin/applications/[id]/route";
import { GET as insights } from "@/app/api/admin/insights/route";
import { POST as track } from "@/app/api/track/route";
import { getGreeting } from "@/lib/applicationsRepo";
import { summarize } from "@/lib/events";
import { __resetRateLimit } from "@/lib/rateLimit";

const req = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost:3000${path}`, { method, headers: { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": "4.4.4.4", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const UUID = "5f3b8f2e-7c1a-4d55-9f0e-0b6f5b5d2a11";
const ctx = { params: Promise.resolve({ id: UUID }) };

function configure() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.ADMIN_EMAIL = "me@example.com";
}

beforeEach(() => {
  __resetRateLimit();
  Object.assign(state, { admin: null, result: { data: null, error: null }, inserts: [], rpcs: [], greetingRow: null });
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL"]) delete process.env[k];
  configure();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("references and applications are admin-only", () => {
  it("401 for everyone who is not the signed-in admin", async () => {
    expect((await listRefs(req("/api/admin/references", "GET"))).status).toBe(401);
    expect((await createRef(req("/api/admin/references", "POST", { name: "A", quote: "Great" }))).status).toBe(401);
    expect((await listApps(req("/api/admin/applications", "GET"))).status).toBe(401);
    expect((await createApp(req("/api/admin/applications", "POST", { slug: "acme-x1", company: "Acme" }))).status).toBe(401);
    expect((await deleteApp(req("/api/admin/applications/x", "DELETE"), ctx)).status).toBe(401);
    expect((await insights(req("/api/admin/insights", "GET"))).status).toBe(401);
  });
});

describe("references (as admin)", () => {
  beforeEach(() => {
    state.admin = { email: "me@example.com" };
  });

  it("creates a reference", async () => {
    state.result = { data: { id: "r1", name: "Sam Lee", title: "Design Lead", company: "Acme", quote: "A joy to work with.", link_url: "https://www.linkedin.com/in/sam", published: true, sort_order: 0 }, error: null };
    const res = await createRef(req("/api/admin/references", "POST", { name: "Sam Lee", title: "Design Lead", company: "Acme", quote: "A joy to work with.", linkUrl: "https://www.linkedin.com/in/sam" }));
    expect(res.status).toBe(201);
    expect(state.inserts[0].row).toMatchObject({ name: "Sam Lee", link_url: "https://www.linkedin.com/in/sam" });
  });

  it("rejects an empty quote and a non-https link", async () => {
    const res = await createRef(req("/api/admin/references", "POST", { name: "Sam", quote: "", linkUrl: "http://insecure.example" }));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error.fields.quote).toBeDefined();
    expect(error.fields.linkUrl).toBeDefined();
  });
});

describe("applications (as admin)", () => {
  beforeEach(() => {
    state.admin = { email: "me@example.com" };
  });
  const app = { slug: "acme-x7k2", company: "Acme", role: "Product Designer", stage: "sent", featuredSlug: "tideline", note: "Hi Acme team", internalNotes: "Recruiter: Jo" };

  it("creates an application and rejects bad slugs and unknown stages", async () => {
    state.result = { data: { id: "a1", slug: "acme-x7k2", company: "Acme", role: "Product Designer", stage: "sent", featured_slug: "tideline", note: "Hi", internal_notes: "", views: 0, last_viewed_at: null }, error: null };
    expect((await createApp(req("/api/admin/applications", "POST", app))).status).toBe(201);
    const bad = await createApp(req("/api/admin/applications", "POST", { ...app, slug: "Bad Slug", stage: "hired" }));
    expect(bad.status).toBe(422);
    const { error } = await bad.json();
    expect(error.fields.slug).toBeDefined();
    expect(error.fields.stage).toBeDefined();
  });

  it("reports a duplicate link as 409, and blocks cross-origin writes", async () => {
    state.result = { data: null, error: { code: "23505" } };
    expect((await createApp(req("/api/admin/applications", "POST", app))).status).toBe(409);
    expect((await updateApp(req("/api/admin/applications/x", "PUT", app, { origin: "https://evil.example" }), ctx)).status).toBe(403);
  });
});

describe("company greeting only exposes public fields", () => {
  it("returns company, role, note and featured project, never internal notes, stage or views", async () => {
    state.greetingRow = { slug: "acme-x7k2", company: "Acme", role: "Product Designer", note: "Hi Acme team", featured_slug: "tideline", internal_notes: "SECRET", stage: "interview", views: 9 };
    const g = await getGreeting("acme-x7k2");
    expect(g).toEqual({ slug: "acme-x7k2", company: "Acme", role: "Product Designer", note: "Hi Acme team", featuredSlug: "tideline" });
    expect(JSON.stringify(g)).not.toMatch(/SECRET|interview/);
  });
  it("returns null for unknown links and malformed slugs without querying", async () => {
    expect(await getGreeting("nope-1234")).toBeNull();
    state.greetingRow = { slug: "x", company: "X" };
    expect(await getGreeting("../etc/passwd")).toBeNull();
  });
});

describe("POST /api/track (privacy-friendly analytics)", () => {
  it("records an event with no personal data and answers 204", async () => {
    const res = await track(req("/api/track", "POST", { type: "project_open", project: "tideline", referrer: "linkedin.com" }));
    expect(res.status).toBe(204);
    expect(state.inserts[0]).toMatchObject({ table: "events", row: { type: "project_open", project_slug: "tideline", referrer_host: "linkedin.com" } });
    expect(Object.keys(state.inserts[0].row).sort()).toEqual(["application_slug", "project_slug", "referrer_host", "type"]);
  });

  it("counts a company-link visit and bumps the application", async () => {
    await track(req("/api/track", "POST", { type: "application_view", application: "acme-x7k2" }));
    expect(state.rpcs).toEqual([{ fn: "touch_application", args: { p_slug: "acme-x7k2" } }]);
  });

  it("rejects unknown event types, bad slugs, cross-origin pings and floods", async () => {
    expect((await track(req("/api/track", "POST", { type: "keylog" }))).status).toBe(422);
    expect((await track(req("/api/track", "POST", { type: "view", project: "../x" }))).status).toBe(422);
    expect((await track(req("/api/track", "POST", { type: "view" }, { origin: "https://evil.example" }))).status).toBe(403);
    for (let i = 0; i < 200; i++) await track(req("/api/track", "POST", { type: "view" }, { "x-forwarded-for": "9.9.9.9" }));
    expect((await track(req("/api/track", "POST", { type: "view" }, { "x-forwarded-for": "9.9.9.9" }))).status).toBe(429);
  });

  it("is a harmless no-op when Supabase is not configured", async () => {
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL"]) delete process.env[k];
    expect((await track(req("/api/track", "POST", { type: "view" }))).status).toBe(204);
    expect(state.inserts).toHaveLength(0);
  });
});

describe("insights summary", () => {
  it("totals events, ranks projects and referrers, and fills 30 days", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const rows = [
      { type: "view", project_slug: null, referrer_host: "linkedin.com", created_at: "2026-10-10T08:00:00Z" },
      { type: "view", project_slug: null, referrer_host: "linkedin.com", created_at: "2026-10-09T08:00:00Z" },
      { type: "view", project_slug: null, referrer_host: null, created_at: "2026-10-09T09:00:00Z" },
      { type: "project_open", project_slug: "tideline", referrer_host: null, created_at: "2026-10-10T08:05:00Z" },
      { type: "project_open", project_slug: "tideline", referrer_host: null, created_at: "2026-10-10T08:06:00Z" },
      { type: "project_open", project_slug: "loop", referrer_host: null, created_at: "2026-10-10T08:07:00Z" },
      { type: "resume_download", project_slug: null, referrer_host: null, created_at: "2026-10-10T08:08:00Z" },
      { type: "contact_send", project_slug: null, referrer_host: null, created_at: "2026-10-10T08:09:00Z" },
    ];
    const s = summarize(rows, now);
    expect(s.totals).toMatchObject({ views: 3, projectOpens: 3, resumeDownloads: 1, contactSends: 1 });
    expect(s.topProjects[0]).toEqual({ slug: "tideline", count: 2 });
    expect(s.referrers[0]).toEqual({ host: "linkedin.com", count: 2 });
    expect(s.daily).toHaveLength(30);
    expect(s.daily.find((d) => d.date === "2026-10-09")?.views).toBe(2);
  });
});
