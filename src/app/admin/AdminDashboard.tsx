"use client";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/data/projects";
import { CoverArt } from "@/components/os/CoverArt";
import { api } from "./adminApi";
import { ApplicationsTab } from "./ApplicationsTab";
import { FeedbackTab } from "./FeedbackTab";
import { InsightsTab } from "./InsightsTab";
import { ProjectForm } from "./ProjectForm";
import { ReferencesTab } from "./ReferencesTab";

type Tab = "insights" | "projects" | "applications" | "feedback" | "references";
const TABS: { id: Tab; label: string }[] = [
  { id: "insights", label: "Insights" },
  { id: "projects", label: "Projects" },
  { id: "applications", label: "Applications" },
  { id: "feedback", label: "Feedback" },
  { id: "references", label: "References" },
];

export function AdminDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("projects");
  const [pending, setPending] = useState(0);
  const [visited, setVisited] = useState<Set<Tab>>(new Set(["projects"]));

  useEffect(() => {
    api<{ pending: number }>("/api/admin/comments?limit=1&status=pending").then((r) => r.ok && setPending(r.data.pending));
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    setVisited((v) => new Set(v).add(t));
  };

  async function signOut() {
    await api("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">Admin</h1>
          <p className="dim small">Signed in as {email}</p>
        </div>
        <div className="row">
          <a className="btn btn-quiet" href="/" target="_blank" rel="noopener noreferrer">View site<span className="sr"> (opens in a new tab)</span></a>
          <button className="btn btn-quiet" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="adm-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} className="adm-tab" onClick={() => go(t.id)}>
            {t.label}
            {t.id === "feedback" && pending > 0 && <span className="badge" aria-label={`${pending} waiting for approval`}>{pending}</span>}
          </button>
        ))}
      </div>

      {TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={tab !== t.id}>
          {visited.has(t.id) && (
            t.id === "projects" ? <ProjectsTab /> :
            t.id === "insights" ? <InsightsTab /> :
            t.id === "applications" ? <ApplicationsTab /> :
            t.id === "feedback" ? <FeedbackTab onPendingChange={setPending} /> :
            <ReferencesTab />
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Projects ---------------- */

function ProjectsTab() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ data: Project[] }>("/api/admin/projects");
    if (r.ok) setProjects(r.data.data);
    else setError(r.error.message);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublished(p: Project) {
    setError("");
    const body = { ...p, coverUrl: p.coverUrl ?? null, images: p.images ?? [], published: !p.published, sortOrder: p.sortOrder ?? 0 };
    const r = await api(`/api/admin/projects/${p.id}`, { method: "PUT", json: body });
    if (!r.ok) setError(r.error.message);
    else load();
  }

  async function remove(p: Project) {
    setError("");
    const r = await api(`/api/admin/projects/${p.id}`, { method: "DELETE" });
    setConfirm(null);
    if (!r.ok) setError(r.error.message);
    else load();
  }

  async function seed() {
    setBusy(true);
    const r = await api("/api/admin/projects/seed", { method: "POST" });
    setBusy(false);
    if (!r.ok) setError(r.error.message);
    else load();
  }

  if (editing) {
    return (
      <ProjectForm
        project={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <section>
      <div className="adm-bar">
        <h2>Your projects</h2>
        <button className="btn" onClick={() => setEditing("new")}>New project</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {projects === null && !error && <p className="dim" role="status">Loading...</p>}
      {projects && projects.length === 0 && (
        <div className="adm-empty">
          <p>No projects in the database yet.</p>
          <div className="row">
            <button className="btn" onClick={() => setEditing("new")}>Add your first project</button>
            <button className="btn btn-quiet" onClick={seed} disabled={busy}>{busy ? "Loading..." : "Load 4 sample projects"}</button>
          </div>
        </div>
      )}
      <ul className="adm-list">
        {projects?.map((p) => (
          <li key={p.id} className="adm-item">
            <CoverArt palette={p.palette} shape={p.shape} coverUrl={p.coverUrl} className="adm-thumb" />
            <div className="adm-item-main">
              <strong>{p.title}</strong>
              <span className="dim small">{p.kind}, {p.year} &middot; /work/{p.slug}</span>
              <span className={`pill ${p.published ? "pill-on" : ""}`}>{p.published ? "Published" : "Draft"}</span>
            </div>
            <div className="adm-actions">
              <button className="btn btn-quiet btn-sm" onClick={() => setEditing(p)}>Edit<span className="sr"> {p.title}</span></button>
              <button className="btn btn-quiet btn-sm" onClick={() => togglePublished(p)}>{p.published ? "Unpublish" : "Publish"}<span className="sr"> {p.title}</span></button>
              {confirm === p.id ? (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Yes, delete</button>
                  <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                </>
              ) : (
                <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(p.id ?? null)}>Delete<span className="sr"> {p.title}</span></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
