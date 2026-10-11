"use client";

type EventType = "view" | "project_open" | "resume_download" | "hire_open" | "application_view";

/**
 * Privacy-friendly event ping. Skipped when the browser sends Do Not Track.
 * Sends only the event type, an optional project/application slug, and the referring hostname.
 */
export function track(type: EventType, extra: { project?: string; application?: string; referrer?: string } = {}) {
  if (typeof navigator === "undefined" || navigator.doNotTrack === "1") return;
  try {
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...extra }), keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

/** Hostname of the site that sent the visitor here, or undefined for direct visits and self-referrals. */
export function referrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host.slice(0, 100) : undefined;
  } catch {
    return undefined;
  }
}
