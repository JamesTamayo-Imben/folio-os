"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./adminApi";
import type { JourneyPhoto } from "@/lib/portfolio-content";

type Photo = JourneyPhoto & { id: string };

export function JourneyGalleryTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const result = await api<{ photos: JourneyPhoto[] }>("/api/admin/portfolio-content/journey");
    if (result.ok) setPhotos(result.data.photos.map((photo) => ({ ...photo, id: crypto.randomUUID() })));
    else setError(result.error.message);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photos.length >= 24) { setError("Journey Gallery is limited to 24 photos."); event.target.value = ""; return; }
    setUploading(true); setError(""); setNotice("");
    const form = new FormData(); form.append("file", file);
    const result = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
    setUploading(false); event.target.value = "";
    if (!result.ok) setError(result.error.message);
    else {
      const nextPhotos = [...photos, { id: crypto.randomUUID(), url: result.data.url, caption: caption.trim() }];
      setSaving(true);
      const saved = await api<{ photos: JourneyPhoto[] }>("/api/admin/portfolio-content/journey", { method: "PUT", json: nextPhotos.map(({ url, caption: photoCaption }) => ({ url, caption: photoCaption })) });
      setSaving(false);
      if (!saved.ok) setError(saved.error.message);
      else {
        setPhotos(saved.data.photos.map((photo) => ({ ...photo, id: crypto.randomUUID() })));
        setCaption("");
        setNotice("Photo added and published in the Journey Gallery.");
      }
    }
  }

  async function save() {
    setSaving(true); setError(""); setNotice("");
    const result = await api<{ photos: JourneyPhoto[] }>("/api/admin/portfolio-content/journey", { method: "PUT", json: photos.map(({ url, caption: photoCaption }) => ({ url, caption: photoCaption })) });
    setSaving(false);
    if (!result.ok) setError(result.error.message);
    else { setNotice("Journey Gallery saved and published."); await load(); }
  }

  return (
    <section className="adm-content-tab">
      <div className="adm-bar"><div><h2>Journey Gallery</h2><p className="dim small">Manage the photos shown in the public, view-only Gallery app.</p></div><button className="btn" type="button" onClick={save} disabled={saving || uploading || loading}>{saving ? "Saving…" : "Save caption/removal changes"}</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="dim" role="status">{notice}</p>}
      <div className="adm-inline-add journey-upload-row"><div><label htmlFor="journey-caption">Caption for next photo</label><input id="journey-caption" value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} placeholder="A moment from the trip" /></div><button className="btn btn-quiet" type="button" onClick={() => inputRef.current?.click()} disabled={loading || uploading || saving || photos.length >= 24}>{uploading ? "Uploading…" : saving ? "Publishing…" : "Add photo"}</button><input ref={inputRef} className="sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} /></div>
      <p className="dim small">{photos.length} of 24 photos. New uploads publish immediately. Save caption or removal edits with the button above.</p>
      {loading ? <p className="dim" role="status">Loading journey photos…</p> : photos.length ? <ul className="adm-journey-list">{photos.map((photo, index) => <li key={photo.id}><img src={photo.url} alt={photo.caption || `Journey photo ${index + 1}`} /><label><span className="sr">Photo caption</span><input value={photo.caption} maxLength={160} onChange={(event) => setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, caption: event.target.value } : item))} placeholder={`Journey photo ${index + 1}`} /></label><button type="button" className="btn btn-quiet btn-sm" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}>Remove</button></li>)}</ul> : <div className="adm-empty"><p>No journey photos yet. Add photos to introduce visitors to your story.</p></div>}
    </section>
  );
}
