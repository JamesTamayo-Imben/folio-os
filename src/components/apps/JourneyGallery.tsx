"use client";
import { useState } from "react";
import { Icon } from "../os/Icon";
import { useSiteProfile } from "../os/site-profile-context";

type GalleryPhoto = { url: string; caption: string };

export function JourneyGallery({ photos }: { photos: GalleryPhoto[] }) {
  const profile = useSiteProfile();
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);

  return (
    <div className="local-app journey-gallery-app">
      <header className="photo-app-heading"><div><p className="local-eyebrow">{profile.name.toUpperCase()} · JOURNEY</p><h2>Journey gallery</h2><p className="dim small">A view-only collection published by the portfolio owner.</p></div><span className="gallery-readonly-badge">VIEW ONLY</span></header>
      <div className="photo-count">{photos.length} {photos.length === 1 ? "photo" : "photos"}<span>Managed from Admin → Profile &amp; résumé</span></div>
      {photos.length ? <div className="photo-grid">{photos.map((photo, index) => <button key={`${photo.url}-${index}`} className="photo-card" onClick={() => setPreview(photo)} aria-label={`View ${photo.caption || `Journey photo ${index + 1}`}`}><img src={photo.url} alt={photo.caption || `Journey photo ${index + 1}`} /><span><strong>{photo.caption || `Journey photo ${index + 1}`}</strong></span></button>)}</div> : <div className="local-empty-state"><span className="local-empty-icon"><Icon name="image" size={30} /></span><h2>No journey photos yet</h2><p>The portfolio owner can upload photos from Admin → Profile &amp; résumé.</p></div>}
      {preview && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={preview.caption || "Journey photo"} onPointerDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }} onKeyDown={(event) => { if (event.key === "Escape") setPreview(null); }}><button className="photo-viewer-close" onClick={() => setPreview(null)} aria-label="Close photo">×</button><img src={preview.url} alt={preview.caption || "Journey photo"} />{preview.caption && <p>{preview.caption}</p>}</div>}
    </div>
  );
}
