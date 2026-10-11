import { NextResponse } from "next/server";

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string[] | undefined> };
  requestId: string;
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  extra: { fields?: Record<string, string[] | undefined>; headers?: Record<string, string> } = {},
) {
  const body: ApiErrorBody = { error: { code, message, fields: extra.fields }, requestId };
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId, "cache-control": "no-store", ...extra.headers },
  });
}
