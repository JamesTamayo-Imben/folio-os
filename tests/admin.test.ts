import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: null as null | { email: string },
  signIn: vi.fn(),
  result: { data: null as unknown, error: null as null | { code?: string; message?: string } },
  upload: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAdmin: async () => state.admin }));
vi.mock("@/lib/supabase/clients", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ["insert", "update", "delete", "upsert", "eq", "select", "order"]) c[m] = () => c;
    c.single = async () => state.result;
    c.maybeSingle = async () => state.result;
    c.upsert = (...args: unknown[]) => (state.upsert(...args), c);
    c.then = (res: (v: unknown) => unknown) => res(state.result);
    return c;
  };
  return {
    publicClient: () => ({ from: chain }),
    sessionClient: async () => ({ auth: { signInWithPassword: state.signIn } }),
    serviceClient: () => ({
      from: chain,
      storage: { from: () => ({ upload: state.upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/project-images/${p}` } }) }) },
    }),
  };
});

import { POST as login } from "@/app/api/admin/login/route";
import { GET as listProjects, POST as createProject } from "@/app/api/admin/projects/route";
import { DELETE as deleteProject } from "@/app/api/admin/projects/[id]/route";
import { GET as listComments } from "@/app/api/admin/comments/route";
import { POST as upload } from "@/app/api/admin/upload/route";
import { GET as getProfile, PUT as updateProfile } from "@/app/api/admin/profile/route";
import { POST as uploadResume } from "@/app/api/admin/resume/route";
import { __resetRateLimit } from "@/lib/rateLimit";

const URL_ = "http://localhost:3000";
const json = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`${URL_}${path}`, { method, headers: { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": "2.2.2.2", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

const project = {
  title: "New Thing", slug: "new-thing", kind: "UI/UX", year: 2026, role: "Designer", tools: ["Figma"], summary: "s", problem: "p",
  process: [{ title: "Step", text: "text" }], result: "r", palette: ["#112233", "#445566", "#778899", "#000000"], shape: "rings",
  coverUrl: null, images: [], published: true, sortOrder: 0,
};
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function configure() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.ADMIN_EMAIL = "Me@Example.com";
}

beforeEach(() => {
  __resetRateLimit();
  state.admin = null;
  state.result = { data: null, error: null };
  state.signIn.mockReset();
  state.upload.mockReset();
  state.upsert.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL"]) delete process.env[k];
});

describe("admin: when Supabase is not configured", () => {
  it("every admin route answers 503 instead of crashing", async () => {
    expect((await listProjects(json("/api/admin/projects", "GET"))).status).toBe(503);
    expect((await login(json("/api/admin/login", "POST", { email: "a@b.co", password: "x" }))).status).toBe(503);
  });
});

describe("admin: authentication and authorization", () => {
  beforeEach(configure);

  it("rejects every admin endpoint with 401 when nobody is signed in", async () => {
    expect((await listProjects(json("/api/admin/projects", "GET"))).status).toBe(401);
    expect((await createProject(json("/api/admin/projects", "POST", project))).status).toBe(401);
    expect((await listComments(json("/api/admin/comments", "GET"))).status).toBe(401);
    expect((await deleteProject(json("/api/admin/projects/x", "DELETE"), ctx("5f3b8f2e-7c1a-4d55-9f0e-0b6f5b5d2a11"))).status).toBe(401);
  });

  it("login: wrong email never reaches Supabase and gets the same vague error", async () => {
    const res = await login(json("/api/admin/login", "POST", { email: "intruder@evil.com", password: "pw" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("INVALID_CREDENTIALS");
    expect(state.signIn).not.toHaveBeenCalled();
  });

  it("login: right email, wrong password is the same vague error", async () => {
    state.signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const res = await login(json("/api/admin/login", "POST", { email: "me@example.com", password: "nope" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe("Email or password is incorrect.");
  });

  it("login: succeeds for the admin email (case-insensitive)", async () => {
    state.signIn.mockResolvedValue({ error: null });
    const res = await login(json("/api/admin/login", "POST", { email: "ME@example.com", password: "right" }));
    expect(res.status).toBe(200);
    expect(state.signIn).toHaveBeenCalledOnce();
  });

  it("login: locks out after 8 attempts", async () => {
    state.signIn.mockResolvedValue({ error: { message: "bad" } });
    for (let i = 0; i < 8; i++) await login(json("/api/admin/login", "POST", { email: "me@example.com", password: "x" }));
    const res = await login(json("/api/admin/login", "POST", { email: "me@example.com", password: "x" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("login: refuses cross-origin requests", async () => {
    const res = await login(json("/api/admin/login", "POST", { email: "me@example.com", password: "x" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("admin: managing projects as the signed-in admin", () => {
  beforeEach(() => {
    configure();
    state.admin = { email: "me@example.com" };
  });

  it("creates a project (201)", async () => {
    state.result = { data: { id: "id-1", ...project, cover_url: null, sort_order: 0, palette: project.palette }, error: null };
    const res = await createProject(json("/api/admin/projects", "POST", project));
    expect(res.status).toBe(201);
    expect((await res.json()).data.slug).toBe("new-thing");
  });

  it("returns field errors for bad input (422)", async () => {
    const res = await createProject(json("/api/admin/projects", "POST", { ...project, slug: "Bad Slug!", palette: ["red", "#000000", "#000000", "#000000"], coverUrl: "http://insecure.example/x.png" }));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error.fields.slug).toBeDefined();
    expect(error.fields.palette).toBeDefined();
    expect(error.fields.coverUrl).toBeDefined();
  });

  it("reports a duplicate slug as 409", async () => {
    state.result = { data: null, error: { code: "23505" } };
    const res = await createProject(json("/api/admin/projects", "POST", project));
    expect(res.status).toBe(409);
  });

  it("even a signed-in admin cannot write from another origin (CSRF guard)", async () => {
    const res = await createProject(json("/api/admin/projects", "POST", project, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("rejects malformed ids before touching the database", async () => {
    expect((await deleteProject(json("/api/admin/projects/nope", "DELETE"), ctx("nope"))).status).toBe(400);
    expect((await deleteProject(json("/api/admin/projects/x", "DELETE"), ctx("5f3b8f2e-7c1a-4d55-9f0e-0b6f5b5d2a11"))).status).toBe(200);
  });

  it("requires an authenticated admin to read and update profile settings", async () => {
    state.admin = null;
    expect((await getProfile(json("/api/admin/profile", "GET"))).status).toBe(401);
    expect((await updateProfile(json("/api/admin/profile", "PUT", {}))).status).toBe(401);
  });

  it("validates profile fields and upserts valid profile settings", async () => {
    state.admin = { email: "me@example.com" };
    const { site } = await import("@/config/site");
    const invalid = await updateProfile(json("/api/admin/profile", "PUT", { ...site, email: "not-an-email" }));
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.fields.email).toBeDefined();
    const valid = await updateProfile(json("/api/admin/profile", "PUT", site));
    expect(valid.status).toBe(200);
    expect(state.upsert).toHaveBeenCalledWith({ id: true, profile: expect.objectContaining({ name: site.name }) }, { onConflict: "id" });
  });

  it("accepts a PDF résumé and rejects spoofed content", async () => {
    state.admin = { email: "me@example.com" };
    state.upload.mockResolvedValue({ error: null });
    const pdf = (bytes: Uint8Array, type = "application/pdf") => {
      const fd = new FormData();
      fd.append("file", new File([bytes as BlobPart], "resume.pdf", { type }));
      return new Request(`${URL_}/api/admin/resume`, { method: "POST", headers: { host: "localhost:3000" }, body: fd });
    };
    expect((await uploadResume(pdf(new TextEncoder().encode("%PDF-1.7")))).status).toBe(201);
    expect((await uploadResume(pdf(new TextEncoder().encode("<html>not pdf</html>")))).status).toBe(415);
    expect(state.upload).toHaveBeenCalledOnce();
  });
});

describe("admin: image upload", () => {
  beforeEach(() => {
    configure();
    state.admin = { email: "me@example.com" };
  });

  const form = (bytes: Uint8Array, name = "pic.png", type = "image/png") => {
    const fd = new FormData();
    fd.append("file", new File([bytes as BlobPart], name, { type }));
    return new Request(`${URL_}/api/admin/upload`, { method: "POST", headers: { host: "localhost:3000" }, body: fd });
  };
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  it("stores a real PNG and returns its public URL", async () => {
    state.upload.mockResolvedValue({ error: null });
    const res = await upload(form(PNG));
    expect(res.status).toBe(201);
    expect((await res.json()).url).toMatch(/project-images\/\d{4}\/.+\.png$/);
  });

  it("rejects files that only claim to be images (checks the real bytes)", async () => {
    const res = await upload(form(new TextEncoder().encode("<svg onload=alert(1)></svg>"), "evil.png", "image/png"));
    expect(res.status).toBe(415);
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("rejects files over 4 MB", async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(PNG);
    expect((await upload(form(big))).status).toBe(413);
  });

  it("requires the admin", async () => {
    state.admin = null;
    expect((await upload(form(PNG))).status).toBe(401);
  });
});
