import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serviceKey, supabaseAnonKey, supabaseUrl } from "./config";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Anonymous, read-only client for public pages. Subject to Row Level Security. */
export function publicClient(): SupabaseClient {
  return createClient(supabaseUrl()!, supabaseAnonKey()!, noSession);
}

/**
 * Service-role client. Bypasses Row Level Security: server only, and only after
 * the caller has validated input and (for admin routes) verified the admin.
 * Never import this from a client component.
 */
export function serviceClient(): SupabaseClient {
  return createClient(supabaseUrl()!, serviceKey()!, noSession);
}

/** Cookie-backed client used for admin sign-in and session checks. */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component: cookies are read-only there, which is fine */
        }
      },
    },
  });
}
