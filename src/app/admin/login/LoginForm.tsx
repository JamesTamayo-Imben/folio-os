"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Could not sign in. Try again.");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="a-email">Email</label>
      <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      <label htmlFor="a-pass">Password</label>
      <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </div>
    </form>
  );
}
