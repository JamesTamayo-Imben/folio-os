export interface ApiFail {
  status: number;
  message: string;
  fields?: Record<string, string[] | undefined>;
}

/** JSON request helper. Sends the visitor to the login page if the session has expired. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<{ ok: true; data: T } | { ok: false; error: ApiFail }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (res.status === 401 && typeof window !== "undefined") window.location.assign("/admin/login");
    if (!res.ok) return { ok: false, error: { status: res.status, message: body?.error?.message ?? "Something went wrong.", fields: body?.error?.fields } };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: { status: 0, message: "Could not reach the server." } };
  }
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
