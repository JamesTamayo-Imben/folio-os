export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
export const adminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase();

/** True when the public (read) side of Supabase can be used. */
export const hasPublicSupabase = () => Boolean(supabaseUrl() && supabaseAnonKey());
/** True when admin features and server-side writes can be used. */
export const hasAdminSupabase = () => Boolean(supabaseUrl() && supabaseAnonKey() && serviceKey() && adminEmail());

export const IMAGE_BUCKET = "project-images";
