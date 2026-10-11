"use client";
import { useRef, useState } from "react";
import { kinds, type Project } from "@/data/projects";
import { CoverArt } from "@/components/os/CoverArt";
import { api, slugify } from "./adminApi";

type Step = { title: string; text: string };
const SHAPES = ["rings", "bars", "blob", "grid"] as const;

export function ProjectForm({ project, onCancel, onSaved }: { project: Project | null; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!project);
  const [kind, setKind] = useState<string>(project?.kind ?? kinds[0]);
  const [year, setYear] = useState(String(project?.year ?? new Date().getFullYear()));
  const [role, setRole] = useState(project?.role ?? "");
  const [tools, setTools] = useState((project?.tools ?? []).join(", "));
  const [summary, setSummary] = useState(project?.summary ?? "");
  const [problem, setProblem] = useState(project?.problem ?? "");
  const [process, setProcess] = useState<Step[]>(project?.process ?? []);
  const [result, setResult] = useState(project?.result ?? "");
  const [palette, setPalette] = useState<string[]>(project?.palette ?? ["#4b57d6", "#c4478f", "#1a8f9a", "#0d1020"]);
  const [shape, setShape] = useState<string>(project?.shape ?? "rings");
  const [coverUrl, setCoverUrl] = useState<string | null>(project?.coverUrl ?? null);
  const [images, setImages] = useState<string[]>(project?.images ?? []);
  const [published, setPublished] = useState(project?.published ?? true);
  const [sortOrder, setSortOrder] = useState(String(project?.sortOrder ?? 0));

  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const err = (k: string) => fields[k]?.[0];

  async function upload(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    const r = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
    if (!r.ok) {
      setError(r.error.message);
      return null;
    }
    return r.data.url;
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    setError("");
    const url = await upload(f);
    if (url) setCoverUrl(url);
    setUploading(false);
  }

  async function onGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 8 - images.length);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    const urls: string[] = [];
    for (const f of files) {
      const u = await upload(f);
      if (u) urls.push(u);
    }
    setImages((cur) => [...cur, ...urls].slice(0, 8));
    setUploading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFields({});
    const payload = {
      title, slug, kind, year: Number(year), role,
      tools: tools.split(",").map((t) => t.trim()).filter(Boolean),
      summary, problem, process: process.filter((s) => s.title.trim()), result, palette, shape,
      coverUrl, images, published, sortOrder: Number(sortOrder) || 0,
    };
    const r = project?.id
      ? await api(`/api/admin/projects/${project.id}`, { method: "PUT", json: payload })
      : await api("/api/admin/projects", { method: "POST", json: payload });
    setSaving(false);
    if (r.ok) return onSaved();
    setError(r.error.message);
    setFields(r.error.fields ?? {});
  }

  const setStep = (i: number, patch: Partial<Step>) => setProcess((p) => p.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <form className="form adm-form" onSubmit={save} noValidate>
      <div className="adm-bar">
        <h2>{project ? `Edit ${project.title}` : "New project"}</h2>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
      </div>

      <label htmlFor="p-title">Title</label>
      <input id="p-title" value={title} maxLength={120} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} aria-invalid={!!err("title")} />
      {err("title") && <p className="field-error">{err("title")}</p>}

      <label htmlFor="p-slug">Web address (slug)</label>
      <input id="p-slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} aria-invalid={!!err("slug")} aria-describedby="p-slug-h" />
      <p id="p-slug-h" className="dim small">Your project will live at /work/{slug || "your-slug"}</p>
      {err("slug") && <p className="field-error">{err("slug")}</p>}

      <div className="adm-grid">
        <div>
          <label htmlFor="p-kind">Discipline</label>
          <select id="p-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="p-year">Year</label>
          <input id="p-year" type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} aria-invalid={!!err("year")} />
        </div>
        <div>
          <label htmlFor="p-order">Order (lower shows first)</label>
          <input id="p-order" type="number" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>

      <label htmlFor="p-role">Your role</label>
      <input id="p-role" value={role} maxLength={120} onChange={(e) => setRole(e.target.value)} />

      <label htmlFor="p-tools">Tools (separate with commas)</label>
      <input id="p-tools" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="Figma, Illustrator" />

      <label htmlFor="p-summary">One-line summary</label>
      <textarea id="p-summary" rows={2} maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} />

      <label htmlFor="p-problem">The problem</label>
      <textarea id="p-problem" rows={4} maxLength={2000} value={problem} onChange={(e) => setProblem(e.target.value)} />

      <fieldset className="adm-fieldset">
        <legend>Process steps</legend>
        {process.map((s, i) => (
          <div key={i} className="adm-step">
            <label htmlFor={`s-t-${i}`}>Step {i + 1} title</label>
            <input id={`s-t-${i}`} value={s.title} maxLength={100} onChange={(e) => setStep(i, { title: e.target.value })} />
            <label htmlFor={`s-x-${i}`}>Step {i + 1} text</label>
            <textarea id={`s-x-${i}`} rows={2} maxLength={1000} value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} />
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setProcess((p) => p.filter((_, k) => k !== i))}>Remove step {i + 1}</button>
          </div>
        ))}
        {process.length < 8 && <button type="button" className="btn btn-quiet btn-sm" onClick={() => setProcess((p) => [...p, { title: "", text: "" }])}>Add a step</button>}
      </fieldset>

      <label htmlFor="p-result">The result</label>
      <textarea id="p-result" rows={3} maxLength={1000} value={result} onChange={(e) => setResult(e.target.value)} />

      <fieldset className="adm-fieldset">
        <legend>Cover</legend>
        <CoverArt palette={palette as [string, string, string, string]} shape={shape as "rings"} coverUrl={coverUrl} label="Cover preview" className="adm-preview" />
        <div className="row">
          <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={onCover} className="sr" id="p-cover" />
          <button type="button" className="btn btn-quiet" onClick={() => coverInput.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : coverUrl ? "Replace cover image" : "Upload cover image"}</button>
          {coverUrl && <button type="button" className="btn btn-quiet" onClick={() => setCoverUrl(null)}>Remove image</button>}
        </div>
        <p className="dim small">JPG, PNG or WebP, up to 4 MB. Without an image, generated art from the colors below is used. The cover also becomes a wallpaper.</p>
        <div className="adm-grid">
          {palette.map((c, i) => (
            <div key={i}>
              <label htmlFor={`p-c-${i}`}>{["Glow 1", "Glow 2", "Glow 3", "Base"][i]}</label>
              <input id={`p-c-${i}`} type="color" value={c} onChange={(e) => setPalette((p) => p.map((x, k) => (k === i ? e.target.value : x)))} className="color" />
            </div>
          ))}
        </div>
        <label htmlFor="p-shape">Pattern</label>
        <select id="p-shape" className="select" value={shape} onChange={(e) => setShape(e.target.value)}>
          {SHAPES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend>Gallery images (up to 8)</legend>
        <ul className="adm-gallery">
          {images.map((u, i) => (
            <li key={u}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Gallery image ${i + 1}`} />
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setImages((g) => g.filter((x) => x !== u))}>Remove image {i + 1}</button>
            </li>
          ))}
        </ul>
        <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onGallery} className="sr" id="p-gallery" />
        {images.length < 8 && <button type="button" className="btn btn-quiet" onClick={() => galleryInput.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : "Add images"}</button>}
      </fieldset>

      <label className="check"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published (visible on the site)</label>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn" type="submit" disabled={saving || uploading}>{saving ? "Saving..." : "Save project"}</button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
