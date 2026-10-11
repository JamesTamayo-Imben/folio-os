import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { getAdmin } from "@/lib/auth";
import { hasAdminSupabase } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="adm-center">
      <div className="adm-card">
        <h1 className="adm-title">{site.osName} admin</h1>
        <p className="dim">Sign in to manage your projects and reviews.</p>
        {hasAdminSupabase() ? (
          <LoginForm />
        ) : (
          <p className="form-error" role="alert">
            Admin is not set up yet. Add the Supabase keys and ADMIN_EMAIL to <code>.env.local</code>, then restart the server. See the README.
          </p>
        )}
        <a className="adm-back" href="/">Back to the portfolio</a>
      </div>
    </main>
  );
}
