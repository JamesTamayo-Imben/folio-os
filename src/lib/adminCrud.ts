import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin, isResponse, requireJson } from "./guard";
import { errorResponse } from "./http";
import { log } from "./logger";
import { serviceClient } from "./supabase/clients";

interface Config<S extends z.ZodTypeAny> {
  label: string; // for messages, e.g. "reference"
  table: string;
  schema: S;
  toRow: (input: z.infer<S>) => Record<string, unknown>;
  fromRow: (row: any) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
  order: { column: string; ascending: boolean }[];
  /** Re-render the public pages after a change. */
  revalidate?: boolean;
  conflictField?: string;
}

const idSchema = z.string().uuid();

/** Standard list/create/update/delete handlers for an admin-only table. */
export function adminCollection<S extends z.ZodTypeAny>(cfg: Config<S>) {
  const afterWrite = () => cfg.revalidate && revalidatePath("/", "layout");

  return {
    async list(req: Request) {
      const requestId = crypto.randomUUID();
      const admin = await guardAdmin(req, requestId);
      if (isResponse(admin)) return admin;
      let q = serviceClient().from(cfg.table).select("*");
      for (const o of cfg.order) q = q.order(o.column, { ascending: o.ascending });
      const { data, error } = await q;
      if (error) {
        log("error", `admin.${cfg.label}_list_failed`, { requestId, code: error.code });
        return errorResponse(500, "INTERNAL", `Could not load ${cfg.label}s.`, requestId);
      }
      return NextResponse.json({ data: (data ?? []).map(cfg.fromRow) }, { headers: { "cache-control": "no-store" } });
    },

    async create(req: Request) {
      const requestId = crypto.randomUUID();
      const admin = await guardAdmin(req, requestId, { write: true });
      if (isResponse(admin)) return admin;
      const bad = requireJson(req, requestId);
      if (bad) return bad;
      const parsed = cfg.schema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return errorResponse(422, "VALIDATION_FAILED", "Fix the highlighted fields.", requestId, { fields: parsed.error.flatten().fieldErrors as Record<string, string[]> });
      const { data, error } = await serviceClient().from(cfg.table).insert(cfg.toRow(parsed.data)).select("*").single();
      if (error) {
        if (error.code === "23505") return errorResponse(409, "CONFLICT", `That ${cfg.conflictField ?? "value"} is already in use.`, requestId, cfg.conflictField ? { fields: { [cfg.conflictField]: ["Already in use."] } } : {});
        log("error", `admin.${cfg.label}_create_failed`, { requestId, code: error.code });
        return errorResponse(500, "INTERNAL", `Could not create the ${cfg.label}.`, requestId);
      }
      afterWrite();
      return NextResponse.json({ data: cfg.fromRow(data) }, { status: 201, headers: { "cache-control": "no-store" } });
    },

    async update(req: Request, ctx: { params: Promise<{ id: string }> }) {
      const requestId = crypto.randomUUID();
      const admin = await guardAdmin(req, requestId, { write: true });
      if (isResponse(admin)) return admin;
      const bad = requireJson(req, requestId);
      if (bad) return bad;
      const id = idSchema.safeParse((await ctx.params).id);
      if (!id.success) return errorResponse(400, "BAD_ID", `That ${cfg.label} id is not valid.`, requestId);
      const parsed = cfg.schema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return errorResponse(422, "VALIDATION_FAILED", "Fix the highlighted fields.", requestId, { fields: parsed.error.flatten().fieldErrors as Record<string, string[]> });
      const { data, error } = await serviceClient().from(cfg.table).update(cfg.toRow(parsed.data)).eq("id", id.data).select("*").maybeSingle();
      if (error) {
        if (error.code === "23505") return errorResponse(409, "CONFLICT", `That ${cfg.conflictField ?? "value"} is already in use.`, requestId, cfg.conflictField ? { fields: { [cfg.conflictField]: ["Already in use."] } } : {});
        log("error", `admin.${cfg.label}_update_failed`, { requestId, code: error.code });
        return errorResponse(500, "INTERNAL", `Could not save the ${cfg.label}.`, requestId);
      }
      if (!data) return errorResponse(404, "NOT_FOUND", `That ${cfg.label} no longer exists.`, requestId);
      afterWrite();
      return NextResponse.json({ data: cfg.fromRow(data) }, { headers: { "cache-control": "no-store" } });
    },

    async remove(req: Request, ctx: { params: Promise<{ id: string }> }) {
      const requestId = crypto.randomUUID();
      const admin = await guardAdmin(req, requestId, { write: true });
      if (isResponse(admin)) return admin;
      const id = idSchema.safeParse((await ctx.params).id);
      if (!id.success) return errorResponse(400, "BAD_ID", `That ${cfg.label} id is not valid.`, requestId);
      const { error } = await serviceClient().from(cfg.table).delete().eq("id", id.data);
      if (error) {
        log("error", `admin.${cfg.label}_delete_failed`, { requestId, code: error.code });
        return errorResponse(500, "INTERNAL", `Could not delete the ${cfg.label}.`, requestId);
      }
      afterWrite();
      return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
    },
  };
}
