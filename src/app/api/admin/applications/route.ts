import { applications } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = applications.list;
export const POST = applications.create;
