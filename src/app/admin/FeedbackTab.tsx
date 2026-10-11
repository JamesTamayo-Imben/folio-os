"use client";
import { useCallback, useEffect, useState } from "react";
import { Stars } from "@/components/os/Stars";
import { api } from "./adminApi";

interface Row {
  id: string;
  projectSlug: string;
  name: string;
  rating: number;
  body: string;
  status: "pending" | "approved";
  createdAt: string;
}
type Filter = "pending" | "approved" | "all";

export function FeedbackTab({ onPendingChange }: { onPendingChange?: (n: number) => void }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, average: null as number | null, pending: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, append = false) => {
      const qs = `limit=25&page=${p}${filter === "all" ? "" : `&status=${filter}`}`;
      const r = await api<{ data: Row[]; total: number; average: number | null; pending: number }>(`/api/admin/comments?${qs}`);
      if (!r.ok) return setError(r.error.message);
      setItems((cur) => (append ? [...cur, ...r.data.data] : r.data.data));
      setMeta({ total: r.data.total, average: r.data.average, pending: r.data.pending });
      onPendingChange?.(r.data.pending);
      setPage(p);
      setLoaded(true);
    },
    [filter, onPendingChange],
  );

  useEffect(() => {
    setLoaded(false);
    load(1);
  }, [load]);

  async function setStatus(id: string, status: "pending" | "approved") {
    setError("");
    const r = await api(`/api/admin/comments/${id}`, { method: "PATCH", json: { status } });
    if (!r.ok) return setError(r.error.message);
    load(1);
  }

  async function remove(id: string) {
    const r = await api(`/api/admin/comments/${id}`, { method: "DELETE" });
    setConfirm(null);
    if (!r.ok) return setError(r.error.message);
    load(1);
  }

  return (
    <section>
      <div className="adm-bar">
        <h2>Feedback and ratings</h2>
        <div className="chips" role="group" aria-label="Filter feedback">
          {(["pending", "approved", "all"] as Filter[]).map((f) => (
            <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "pending" ? `Waiting for approval${meta.pending ? ` (${meta.pending})` : ""}` : f === "approved" ? "Live" : "All"}
            </button>
          ))}
        </div>
      </div>
      <p className="dim small">New feedback stays hidden until you approve it, so a stranger can never put something unwanted in front of a recruiter.{meta.average !== null ? ` Average of live reviews: ${meta.average.toFixed(1)}.` : ""}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loaded && !error && <p className="dim" role="status">Loading...</p>}
      {loaded && items.length === 0 && <p className="dim">{filter === "pending" ? "Nothing waiting. You are all caught up." : "Nothing here yet."}</p>}
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Rating</th><th scope="col">On</th><th scope="col">Comment</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.name}</th>
                  <td><Stars value={c.rating} size={14} /></td>
                  <td>{c.projectSlug}</td>
                  <td className="adm-body">{c.body}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td><span className={`pill ${c.status === "approved" ? "pill-on" : ""}`}>{c.status === "approved" ? "Live" : "Waiting"}</span></td>
                  <td>
                    <span className="row-inline">
                      {c.status === "pending" ? (
                        <button className="btn btn-sm" onClick={() => setStatus(c.id, "approved")}>Approve<span className="sr"> comment by {c.name}</span></button>
                      ) : (
                        <button className="btn btn-quiet btn-sm" onClick={() => setStatus(c.id, "pending")}>Hide<span className="sr"> comment by {c.name}</span></button>
                      )}
                      {confirm === c.id ? (
                        <>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Yes, delete</button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(c.id)}>Delete<span className="sr"> comment by {c.name}</span></button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length < meta.total && <button className="btn btn-quiet" onClick={() => load(page + 1, true)}>Show more</button>}
    </section>
  );
}
