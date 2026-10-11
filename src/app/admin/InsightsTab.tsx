"use client";
import { useEffect, useState } from "react";
import type { Insights } from "@/lib/events";
import { api } from "./adminApi";

export function InsightsTab() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Insights>("/api/admin/insights").then((r) => (r.ok ? setData(r.data) : setError(r.error.message)));
  }, []);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) return <p className="dim" role="status">Loading...</p>;

  const max = Math.max(1, ...data.daily.map((d) => d.views));
  const cards: [string, number][] = [
    ["Visits", data.totals.views],
    ["Projects opened", data.totals.projectOpens],
    ["Hire me opened", data.totals.hireOpens],
    ["Résumé downloads", data.totals.resumeDownloads],
    ["Messages sent", data.totals.contactSends],
    ["Company link visits", data.totals.applicationViews],
  ];

  return (
    <section>
      <div className="adm-bar"><h2>Last {data.days} days</h2></div>
      <p className="dim small">No cookies, and no IP addresses or browser details are stored. Visitors who send Do Not Track are not counted.</p>
      <ul className="stat-grid">
        {cards.map(([label, n]) => (
          <li key={label} className="stat"><span className="stat-n">{n}</span><span className="dim small">{label}</span></li>
        ))}
      </ul>

      <h3 className="adm-h3">Visits per day</h3>
      <div className="bars" role="img" aria-label={`Visits per day over the last ${data.days} days. Total ${data.totals.views}. Busiest day ${max}.`}>
        {data.daily.map((d) => (
          <span key={d.date} className="bar" title={`${d.date}: ${d.views}`} style={{ height: `${Math.max(3, (d.views / max) * 100)}%` }} />
        ))}
      </div>

      <div className="adm-grid adm-lists">
        <div>
          <h3 className="adm-h3">Most opened projects</h3>
          {data.topProjects.length === 0 ? <p className="dim">Nothing yet.</p> : (
            <ol className="rank">{data.topProjects.map((p) => <li key={p.slug}><span>{p.slug}</span><strong>{p.count}</strong></li>)}</ol>
          )}
        </div>
        <div>
          <h3 className="adm-h3">Where visitors came from</h3>
          {data.referrers.length === 0 ? <p className="dim">Mostly direct visits so far.</p> : (
            <ol className="rank">{data.referrers.map((r) => <li key={r.host}><span>{r.host}</span><strong>{r.count}</strong></li>)}</ol>
          )}
        </div>
      </div>
    </section>
  );
}
