"use client";
import { useCallback, useEffect, useState } from "react";
import type { Reference } from "@/lib/referencesRepo";
import { api } from "./adminApi";

const blank: Reference = { name: "", title: "", company: "", quote: "", linkUrl: null, published: true, sortOrder: 0 };

export function ReferencesTab() {
  const [items, setItems] = useState<Reference[] | null>(null);
  const [editing, setEditing] = useState<Reference | null>(null);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ data: Reference[] }>("/api/admin/references");
    if (r.ok) setItems(r.data.data);
    else setError(r.error.message);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    setFields({});
    const payload = { name: editing.name, title: editing.title, company: editing.company, quote: editing.quote, linkUrl: editing.linkUrl || null, published: editing.published, sortOrder: Number(editing.sortOrder) || 0 };
    const r = editing.id ? await api(`/api/admin/references/${editing.id}`, { method: "PUT", json: payload }) : await api("/api/admin/references", { method: "POST", json: payload });
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
    const r = await api(`/api/admin/references/${id}`, { method: "DELETE" });
    setConfirm(null);
    if (!r.ok) setError(r.error.message);
    else load();
  }

  const set = (patch: Partial<Reference>) => setEditing((e) => (e ? { ...e, ...patch } : e));
  const err = (k: string) => fields[k]?.[0];

  if (editing) {
    return (
      <form className="form adm-form" onSubmit={save} noValidate>
        <div className="adm-bar">
          <h2>{editing.id ? "Edit reference" : "New reference"}</h2>
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
        </div>
        <label htmlFor="r-name">Name</label>
        <input id="r-name" value={editing.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!err("name")} />
        {err("name") && <p className="field-error">{err("name")}</p>}
        <div className="adm-grid">
          <div><label htmlFor="r-title">Their job title</label><input id="r-title" value={editing.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} /></div>
          <div><label htmlFor="r-company">Their company</label><input id="r-company" value={editing.company} maxLength={120} onChange={(e) => set({ company: e.target.value })} /></div>
        </div>
        <label htmlFor="r-quote">Quote (up to 400 characters)</label>
        <textarea id="r-quote" rows={4} maxLength={400} value={editing.quote} onChange={(e) => set({ quote: e.target.value })} aria-invalid={!!err("quote")} />
        {err("quote") && <p className="field-error">{err("quote")}</p>}
        <label htmlFor="r-link">LinkedIn or profile link (optional, https)</label>
        <input id="r-link" type="url" value={editing.linkUrl ?? ""} onChange={(e) => set({ linkUrl: e.target.value })} aria-invalid={!!err("linkUrl")} />
        {err("linkUrl") && <p className="field-error">{err("linkUrl")}</p>}
        <div className="adm-grid">
          <div><label htmlFor="r-order">Order (lower shows first)</label><input id="r-order" type="number" inputMode="numeric" value={editing.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value) })} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={editing.published} onChange={(e) => set({ published: e.target.checked })} /> Published (visible on the site)</label>
        <p className="dim small">Only add quotes people have given you permission to share.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save reference"}</button>
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <section>
      <div className="adm-bar">
        <h2>References</h2>
        <button className="btn" onClick={() => setEditing({ ...blank })}>New reference</button>
      </div>
      <p className="dim small">Quotes from managers, clients and teammates. They appear on the Hire me and About screens. Hiring managers trust these more than anonymous ratings.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {items === null && !error && <p className="dim" role="status">Loading...</p>}
      {items && items.length === 0 && <div className="adm-empty"><p>No references yet. Add one from a manager, client or teammate.</p></div>}
      <ul className="adm-list">
        {items?.map((r) => (
          <li key={r.id} className="adm-item adm-item-ref">
            <div className="adm-item-main">
              <strong>{r.name}</strong>
              <span className="dim small">{[r.title, r.company].filter(Boolean).join(" at ") || "No title"}</span>
              <span className="adm-quote">&ldquo;{r.quote}&rdquo;</span>
              <span className={`pill ${r.published ? "pill-on" : ""}`}>{r.published ? "Published" : "Hidden"}</span>
            </div>
            <div className="adm-actions">
              <button className="btn btn-quiet btn-sm" onClick={() => setEditing(r)}>Edit<span className="sr"> {r.name}</span></button>
              {confirm === r.id ? (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(r.id!)}>Yes, delete</button>
                  <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                </>
              ) : (
                <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(r.id!)}>Delete<span className="sr"> {r.name}</span></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
