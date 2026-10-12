"use client";
import { useEffect, useState } from "react";
import { site, type SiteProfile } from "@/config/site";
import { api } from "./adminApi";

const splitLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export function AccountTab() {
  const [profile, setProfile] = useState<SiteProfile>(site);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"profile" | "resume" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<{ profile: Partial<SiteProfile> | null }>("/api/admin/profile").then((r) => {
      if (r.ok && r.data.profile) setProfile({ ...site, ...r.data.profile });
      else if (!r.ok) setError(r.error.message);
      setLoading(false);
    });
  }, []);

  const set = (patch: Partial<SiteProfile>) => setProfile((current) => ({ ...current, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const result = await api<{ profile: SiteProfile }>("/api/admin/profile", { method: "PUT", json: profile });
    setSaving(false);
    if (!result.ok) setError(result.error.message);
    else { setProfile(result.data.profile); setNotice("Profile saved. The public site has been revalidated."); }
  }

  async function uploadProfileImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("profile"); setError(""); setNotice("");
    const form = new FormData(); form.append("file", file);
    const result = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
    setUploading(null); e.target.value = "";
    if (!result.ok) setError(result.error.message);
    else { set({ profileImageUrl: result.data.url }); setNotice("Profile picture uploaded. Save the profile to publish it."); }
  }

  async function uploadResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("resume"); setError(""); setNotice("");
    const form = new FormData(); form.append("file", file);
    const result = await api<{ url: string }>("/api/admin/resume", { method: "POST", body: form });
    setUploading(null); e.target.value = "";
    if (!result.ok) setError(result.error.message);
    else { set({ resumeUrl: result.data.url }); setNotice("Résumé uploaded. Save profile to publish the new résumé link."); }
  }

  if (loading) return <p className="dim" role="status">Loading account profile...</p>;

  return (
    <form className="form adm-form" onSubmit={save}>
      <div className="adm-bar"><h2>Profile &amp; résumé</h2></div>
      <p className="dim small">These details appear across your public portfolio. Save changes to publish them.</p>
      <fieldset className="adm-fieldset">
        <legend>Profile picture</legend>
        <div className="row" style={{ marginTop: 0 }}>
          {profile.profileImageUrl ? (
            <img className="avatar lg" src={profile.profileImageUrl} alt="Profile" style={{ objectFit: "cover" }} />
          ) : (
            <div className="avatar lg" aria-hidden="true">{initials(profile.name || "Profile")}</div>
          )}
        </div>
        <label htmlFor="profile-image-file">Upload a profile photo (JPG, PNG or WebP, max 4 MB)</label>
        <input id="profile-image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileImage} disabled={uploading !== null} />
        {profile.profileImageUrl && (
          <button type="button" className="btn btn-quiet" onClick={() => set({ profileImageUrl: "" })} style={{ marginTop: 8 }}>
            Remove photo
          </button>
        )}
        {uploading === "profile" && <p className="dim small" role="status">Uploading profile picture...</p>}
      </fieldset>
      <div className="adm-grid">
        <div><label htmlFor="profile-name">Name</label><input id="profile-name" value={profile.name} maxLength={100} onChange={(e) => set({ name: e.target.value })} required /></div>
        <div><label htmlFor="profile-role">Role</label><input id="profile-role" value={profile.role} maxLength={100} onChange={(e) => set({ role: e.target.value })} required /></div>
      </div>
      <label htmlFor="profile-headline">Headline</label><textarea id="profile-headline" rows={2} value={profile.headline} maxLength={300} onChange={(e) => set({ headline: e.target.value })} />
      <div className="adm-grid">
        <div><label htmlFor="profile-email">Email</label><input id="profile-email" type="email" value={profile.email} maxLength={120} onChange={(e) => set({ email: e.target.value })} /></div>
        <div><label htmlFor="profile-location">Location</label><input id="profile-location" value={profile.location} maxLength={120} onChange={(e) => set({ location: e.target.value })} /></div>
      </div>
      <label htmlFor="profile-availability">Availability</label><input id="profile-availability" value={profile.availability} maxLength={160} onChange={(e) => set({ availability: e.target.value })} />
      <label htmlFor="profile-bio">About (one paragraph per line)</label><textarea id="profile-bio" rows={5} value={profile.bio.join("\n")} onChange={(e) => set({ bio: splitLines(e.target.value) })} />
      <div className="adm-grid">
        <div><label htmlFor="profile-skills">Skills (one per line)</label><textarea id="profile-skills" rows={5} value={profile.skills.join("\n")} onChange={(e) => set({ skills: splitLines(e.target.value) })} /></div>
        <div><label htmlFor="profile-tools">Tools (one per line)</label><textarea id="profile-tools" rows={5} value={profile.tools.join("\n")} onChange={(e) => set({ tools: splitLines(e.target.value) })} /></div>
      </div>
      <label htmlFor="profile-highlights">Strengths shown on Hire me (one per line)</label><textarea id="profile-highlights" rows={3} value={profile.highlights.join("\n")} onChange={(e) => set({ highlights: splitLines(e.target.value) })} />
      <div className="adm-grid">
        <div><label htmlFor="profile-linkedin">LinkedIn (https URL)</label><input id="profile-linkedin" type="url" value={profile.linkedin} onChange={(e) => set({ linkedin: e.target.value })} /></div>
        <div><label htmlFor="profile-featured">Featured project slug</label><input id="profile-featured" value={profile.featuredSlug} maxLength={80} onChange={(e) => set({ featuredSlug: e.target.value })} /></div>
      </div>
      <label htmlFor="profile-socials">Social links (one per line: label | https://...)</label><textarea id="profile-socials" rows={4} value={profile.socials.map((item) => `${item.label} | ${item.href}`).join("\n")} onChange={(e) => set({ socials: splitLines(e.target.value).map((line) => { const [label, ...url] = line.split("|"); return { label: label.trim(), href: url.join("|").trim() }; }) })} />
      <fieldset className="adm-fieldset">
        <legend>Résumé</legend>
        <label htmlFor="profile-resume-url">Current résumé URL</label><input id="profile-resume-url" value={profile.resumeUrl} onChange={(e) => set({ resumeUrl: e.target.value })} />
        <label htmlFor="profile-resume-file">Upload a PDF résumé (max 4 MB)</label><input id="profile-resume-file" type="file" accept="application/pdf,.pdf" onChange={uploadResume} disabled={uploading !== null} />
        {uploading === "resume" && <p className="dim small" role="status">Uploading résumé...</p>}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="dim" role="status">{notice}</p>}
      <button className="btn" type="submit" disabled={saving || uploading !== null}>{saving ? "Saving..." : "Save profile"}</button>
    </form>
  );
}