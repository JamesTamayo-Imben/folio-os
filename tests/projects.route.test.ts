import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/projects/route";

const call = (qs = "") => GET(new Request(`http://localhost:3000/api/projects${qs}`));

describe("GET /api/projects", () => {
  it("filters by kind", async () => {
    const json = await (await call("?kind=Motion")).json();
    expect(json.total).toBe(1);
    expect(json.data[0].slug).toBe("loop");
  });
  it("paginates", async () => {
    const json = await (await call("?limit=2&page=2")).json();
    expect(json.data).toHaveLength(2);
    expect(json.total).toBe(5);
  });
  it("rejects invalid query with 422", async () => {
    expect((await call("?limit=999")).status).toBe(422);
    expect((await call("?kind=Sculpture")).status).toBe(422);
  });
});
