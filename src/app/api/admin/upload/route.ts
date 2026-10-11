import { NextResponse } from "next/server";
import { guardAdmin, isResponse } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { log } from "@/lib/logger";
import { IMAGE_BUCKET } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/clients";
import { sniffImage } from "@/lib/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // stays under common serverless body limits (4.5 MB)

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const admin = await guardAdmin(req, requestId, { write: true });
  if (isResponse(admin)) return admin;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, "BAD_REQUEST", "Send the image as multipart form data.", requestId);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse(422, "VALIDATION_FAILED", "Choose an image file.", requestId);
  if (file.size === 0) return errorResponse(422, "VALIDATION_FAILED", "That file is empty.", requestId);
  if (file.size > MAX_BYTES) return errorResponse(413, "PAYLOAD_TOO_LARGE", "Images must be under 4 MB. Export a smaller version.", requestId);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Use a JPG, PNG or WebP image.", requestId);

  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${kind.ext}`;
  const db = serviceClient();
  const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: kind.mime, cacheControl: "31536000", upsert: false });
  if (error) {
    log("error", "admin.upload_failed", { requestId, message: error.message });
    return errorResponse(500, "INTERNAL", "Upload failed. Check that the storage bucket exists.", requestId);
  }
  const { data } = db.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201, headers: { "cache-control": "no-store" } });
}
