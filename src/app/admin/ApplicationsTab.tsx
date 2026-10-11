"use client";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/data/projects";
import type { Application } from "@/lib/applicationsRepo";
import { STAGES } from "@/lib/validation";
import { api, slugify } from "./adminApi";

const suffix = () => Math.random().toString(36).slice(2, 6);
const blank = (): Application => ({ slug: "", company: "", role: "", stage: "draft", featuredSlug: null, note: "", internalNotes: "", views: 0, lastViewedAt: null });
const payload = (a: Application) => ({ slug: a.slug, company: a.company, role: a.role, stage: a.stage, featuredSlug: a.featuredSlug || null, note: a.note, internalNotes: a.internalNotes });

export function ApplicationsTab() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Application | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([api<{ data: Application[] }>("/api/admin/applications"), api<{ data: Project[] }>("/api/admin/projects")]);
    if (a.ok) setItems(a.data.data);
    else setError(a.error.message);
    if (p.ok) setProjects(p.data.data);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const linkFor = (slug: string) => `${window.location.origin}/for/${slug}`;

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(linkFor(slug));
      setCopied(slug);
      setTimeout(() => setCopied(""), 2500);
    } catch {
      window.prompt("Copy this link:", linkFor(slug));
    }
  }

  async function changeStage(a: Application, stage: Application["stage"]) {
    const r = await api(`/api/admin/applications/${a.id}`, { method: "PUT", json: payload({ ...a, stage }) });
    if (!r.ok) setError(r.error.message);
    else load();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    setFields({});
    const r = editing.id ? await api(`/api/admin/applications/${editing.id}`, { method: "PUT", json: payload(editing) }) : await api("/api/admin/applications", { method: "POST", json: payload(editing) });
    setSaving(false);
    if (!r.ok) {
      setError(r.error.message);
      setFields(r.error.fields ?? {});
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const r = await api(`/api/admin/applications/${id}`, { method: "DELETE" });
    setConfirm(null);
    if (!r.ok) setError(r.error.message);
    else load();
  }

  const set = (patch: Partial<Application>) => setEditing((e) => (e ? { ...e, ...patch } : e));
  const err = (k: string) => fields[k]?.[0];

  if (editing) {
    return (
      <form className="form adm-form" onSubmit={save} noValidate>
        <div className="adm-bar">
          <h2>{editing.id ? `Edit ${editing.company}` : "New application"}</h2>
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
        </div>
        <div className="adm-grid">
          <div>
            <label htmlFor="a-company">Company</label>
            <input id="a-company" value={editing.company} maxLength={80} onChange={(e) => { set({ company: e.target.value, ...(slugTouched || editing.id ? {} : { slug: `${slugify(e.target.value)}${e.target.value ? "-" + suffix() : ""}` }) }); }} aria-invalid={!!err("company")} />
            {err("company") && <p className="field-error">{err("company")}</p>}
          </div>
          <div>
            <label htmlFor="a-role">Role you are applying for</label>
            <input id="a-role" value={editing.role} maxLength={80} onChange={(e) => set({ role: e.target.value })} />
          </div>
        </div>
        <label htmlFor="a-slug">Private link</label>
        <input id="a-slug" value={editing.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }} aria-invalid={!!err("slug")} aria-describedby="a-slug-h" />
        <p id="a-slug-h" className="dim small">Their link: /for/{editing.slug || "company-xxxx"}. The random ending keeps it from being guessed.</p>
        {err("slug") && <p className="field-error">{err("slug")}</p>}
        <label htmlFor="a-featured">Project to open first</label>
        <select id="a-featured" className="select" value={editing.featuredSlug ?? ""} onChange={(e) => set({ featuredSlug: e.target.value || null })}>
          <option value="">Default featured project</option>
          {projects.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
        </select>
        <label htmlFor="a-note">Short greeting shown on the lock screen (optional)</label>
        <input id="a-note" value={editing.note} maxLength={200} onChange={(e) => set({ note: e.target.value })} placeholder="Here is the work most relevant to your design systems team." aria-invalid={!!err("note")} />
        {err("note") && <p className="field-error">{err("note")}</p>}
        <label htmlFor="a-stage">Stage</label>
        <select id="a-stage" className="select" value={editing.stage} onChange={(e) => set({ stage: e.target.value as Application["stage"] })}>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label htmlFor="a-notes">Private notes (never shown to anyone else)</label>
        <textarea id="a-notes" rows={3} maxLength={1000} value={editing.internalNotes} onChange={(e) => set({ internalNotes: e.target.value })} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save application"}</button>
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <section>
      <div className="adm-bar">
        <h2>Applications</h2>
        <button className="btn" onClick={() => { setSlugTouched(false); setEditing(blank()); }}>New application</button>
      </div>
      <p className="dim small">Make a private link for each company. It greets them by name, opens the project you choose, and counts when it is opened. Set the stage to <strong>sent</strong> after you share it and it turns to <strong>viewed</strong> on their first visit.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="sr" role="status">{copied ? "Link copied" : ""}</p>
      {items === null && !error && <p className="dim" role="status">Loading...</p>}
      {items && items.length === 0 && <div className="adm-empty"><p>No applications yet. Add the first company you are applying to.</p></div>}
      {items && items.length > 0 && (
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th scope="col">Company</th><th scope="col">Stage</th><th scope="col">Views</th><th scope="col">Last viewed</th><th scope="col"><span className="sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{a.company}<br /><span className="dim small">{a.role}</span></th>
                  <td>
                    <label className="sr" htmlFor={`st-${a.id}`}>Stage for {a.company}</label>
                    <select id={`st-${a.id}`} className="select select-sm" value={a.stage} onChange={(e) => changeStage(a, e.target.value as Application["stage"])}>
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{a.views}</td>
                  <td>{a.lastViewedAt ? new Date(a.lastViewedAt).toLocaleString() : "Not yet"}</td>
                  <td>
                    <span className="row-inline">
                      <button className="btn btn-sm" onClick={() => copy(a.slug)}>{copied === a.slug ? "Copied" : "Copy link"}<span className="sr"> for {a.company}</span></button>
                      <button className="btn btn-quiet btn-sm" onClick={() => { setSlugTouched(true); setEditing(a); }}>Edit<span className="sr"> {a.company}</span></button>
                      {confirm === a.id ? (
                        <>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(a.id!)}>Yes, delete</button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(a.id!)}>Delete<span className="sr"> {a.company}</span></button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
