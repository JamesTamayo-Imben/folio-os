"use client";
import { useState } from "react";
import { site } from "@/config/site";
import { Icon } from "../os/Icon";

type Fields = Partial<Record<"name" | "email" | "message", string[]>>;
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string; fields?: Fields };

export function Mail() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [values, setValues] = useState({ name: "", email: "", message: "", website: "" });
  const fields = status.kind === "error" ? status.fields ?? {} : {};

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (res.ok) {
        setStatus({ kind: "sent" });
        return;
      }
      const body = await res.json().catch(() => null);
      setStatus({ kind: "error", message: body?.error?.message ?? "Something went wrong. Try again in a moment.", fields: body?.error?.fields });
    } catch {
      setStatus({ kind: "error", message: `Could not reach the server. Email ${site.email} directly instead.` });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="pad center-col" role="status">
        <div className="big-check"><Icon name="check" size={28} /></div>
        <h1 className="about-name">Message sent</h1>
        <p className="dim">Thanks, {values.name.split(" ")[0]}. I reply within two working days.</p>
        <button className="btn btn-quiet" onClick={() => { setValues({ name: "", email: "", message: "", website: "" }); setStatus({ kind: "idle" }); }}>
          Write another
        </button>
      </div>
    );
  }

  const err = (k: keyof Fields) => fields[k]?.[0];

  return (
    <form className="pad form" onSubmit={submit} noValidate>
      <h1 className="about-name">New message to {site.name.split(" ")[0]}</h1>
      <p className="dim">Tell me what you are working on. A few lines is plenty.</p>

      <label htmlFor="m-name">Your name</label>
      <input id="m-name" value={values.name} onChange={set("name")} autoComplete="name" aria-invalid={!!err("name")} aria-describedby={err("name") ? "m-name-e" : undefined} />
      {err("name") && <p id="m-name-e" className="field-error">{err("name")}</p>}

      <label htmlFor="m-email">Email</label>
      <input id="m-email" type="email" value={values.email} onChange={set("email")} autoComplete="email" aria-invalid={!!err("email")} aria-describedby={err("email") ? "m-email-e" : undefined} />
      {err("email") && <p id="m-email-e" className="field-error">{err("email")}</p>}

      <label htmlFor="m-msg">Message</label>
      <textarea id="m-msg" rows={6} value={values.message} onChange={set("message")} aria-invalid={!!err("message")} aria-describedby={err("message") ? "m-msg-e" : undefined} />
      {err("message") && <p id="m-msg-e" className="field-error">{err("message")}</p>}

      {/* Honeypot: hidden from people and assistive tech, tempting to bots */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="m-site">Website</label>
        <input id="m-site" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
      </div>

      {status.kind === "error" && <p className="form-error" role="alert">{status.message}</p>}

      <div className="row">
        <button className="btn" type="submit" disabled={status.kind === "sending"}>
          <Icon name="send" size={16} /> {status.kind === "sending" ? "Sending..." : "Send message"}
        </button>
        <span className="dim small">or {site.email}</span>
      </div>
    </form>
  );
}
