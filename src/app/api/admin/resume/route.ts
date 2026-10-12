import { NextResponse } from "next/server";
import { guardAdmin, isResponse } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { RESUME_BUCKET } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;
  let form: FormData;
  try { form = await req.formData(); } catch { return errorResponse(400, "BAD_REQUEST", "Send the résumé as multipart form data.", requestId); }
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse(422, "VALIDATION_FAILED", "Choose a PDF résumé.", requestId);
  if (!file.size) return errorResponse(422, "VALIDATION_FAILED", "That file is empty.", requestId);
  if (file.size > MAX_BYTES) return errorResponse(413, "PAYLOAD_TOO_LARGE", "PDF résumés must be under 4 MB.", requestId);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder().decode(bytes.slice(0, 5));
  if (signature !== "%PDF-" || (file.type && file.type !== "application/pdf")) {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Upload a valid PDF file.", requestId);
  }
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.pdf`;
  const db = serviceClient();
  const { error } = await db.storage.from(RESUME_BUCKET).upload(path, bytes, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
  if (error) {
    log("error", "admin.resume_upload_failed", { requestId, message: error.message });
    return errorResponse(500, "INTERNAL", "Upload failed. Check that the résumé storage bucket exists.", requestId);
  }
  const { data } = db.storage.from(RESUME_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201, headers: { "cache-control": "no-store" } });
}