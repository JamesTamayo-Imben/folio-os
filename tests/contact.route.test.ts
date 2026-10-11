import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";
import { __resetRateLimit } from "@/lib/rateLimit";

const body = { name: "Ana Reyes", email: "ana@studio.com", message: "I would love to talk about a branding project." };

function req(payload: unknown, headers: Record<string, string> = {}, raw?: string) {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": "9.9.9.9", ...headers },
    body: raw ?? JSON.stringify(payload),
  });
}

beforeEach(() => {
  __resetRateLimit();
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/contact", () => {
  it("accepts a valid message (202) and returns a request id", async () => {
    const res = await POST(req(body));
    expect(res.status).toBe(202);
    expect((await res.json()).ok).toBe(true);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
  it("returns 422 with field errors for invalid input", async () => {
    const res = await POST(req({ ...body, email: "bad" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
    expect(json.error.fields.email).toBeDefined();
  });
  it("returns 400 for malformed JSON", async () => {
    expect((await POST(req(null, {}, "{oops"))).status).toBe(400);
  });
  it("returns 415 when content type is not JSON", async () => {
    expect((await POST(req(body, { "content-type": "text/plain" }))).status).toBe(415);
  });
  it("returns 413 for oversized bodies", async () => {
    expect((await POST(req(null, {}, JSON.stringify({ ...body, pad: "x".repeat(11_000) })))).status).toBe(413);
  });
  it("rejects cross-origin requests (403)", async () => {
    expect((await POST(req(body, { origin: "https://evil.example" }))).status).toBe(403);
  });
  it("silently accepts honeypot hits without sending", async () => {
    const res = await POST(req({ ...body, website: "http://spam" }));
    expect(res.status).toBe(202);
  });
  it("rate limits after 5 requests (429 + retry-after)", async () => {
    for (let i = 0; i < 5; i++) expect((await POST(req(body))).status).toBe(202);
    const res = await POST(req(body));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});
