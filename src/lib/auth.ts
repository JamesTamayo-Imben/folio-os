import { adminEmail, hasAdminSupabase } from "./supabase/config";
import { sessionClient } from "./supabase/clients";

export interface Admin {
  email: string;
}

/**
 * Returns the signed-in admin or null.
 * Uses getUser(), which asks Supabase to validate the token (unlike getSession(),
 * which only reads the cookie), and then requires the email to match ADMIN_EMAIL.
 */
export async function getAdmin(): Promise<Admin | null> {
  if (!hasAdminSupabase()) return null;
  try {
    const supabase = await sessionClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    const email = data.user.email.toLowerCase();
    return email === adminEmail() ? { email } : null;
  } catch {
    return null;
  }
}
