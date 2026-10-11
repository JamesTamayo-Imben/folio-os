"use client";
import { useCallback, useEffect, useState } from "react";
import { StarInput, Stars } from "../os/Stars";
import { useProjects } from "../os/projects-context";

interface CommentDTO {
  id: string;
  projectSlug: string;
  name: string;
  rating: number;
  body: string;
  createdAt: string;
}
interface ListDTO {
  data: CommentDTO[];
  total: number;
  average: number | null;
}
type Fields = Partial<Record<"project" | "name" | "rating" | "body", string[]>>;

const PAGE = 10;

const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

/**
 * Reviews with star ratings. With `project` it shows that project's comments;
 * without it, it shows everyone's and lets the visitor pick what they are commenting on.
 */
export function CommentsPanel({ project }: { project?: string }) {
  const projects = useProjects();
  const titleOf = (slug: string) => (slug === "general" ? "General" : (projects.find((p) => p.slug === slug)?.title ?? slug));

  const [list, setList] = useState<CommentDTO[]>([]);
  const [meta, setMeta] = useState<{ total: number; average: number | null }>({ total: 0, average: null });
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [target, setTarget] = useState(project ?? "general");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [fields, setFields] = useState<Fields>({});
  const [formError, setFormError] = useState("");
  const [thanks, setThanks] = useState<"" | "live" | "pending">("");

  const query = (p: number) => `/api/comments?limit=${PAGE}&page=${p}${project ? `&project=${encodeURIComponent(project)}` : ""}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(query(1), { cache: "no-store" });
      if (res.status === 503) return setState("unavailable");
      if (!res.ok) return setState("error");
      const json: ListDTO = await res.json();
      setList(json.data);
      setMeta({ total: json.total, average: json.average });
      setPage(1);
      setState("ready");
    } catch {
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  useEffect(() => {
    load();
  }, [load]);

  async function more() {
    setLoadingMore(true);
    try {
      const res = await fetch(query(page + 1), { cache: "no-store" });
      if (res.ok) {
        const json: ListDTO = await res.json();
        setList((l) => [...l, ...json.data]);
        setPage((p) => p + 1);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setFields({});
    setFormError("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: target, name, rating: rating || undefined, body, website }),
      });
      if (res.ok) {
        setName("");
        setBody("");
        setRating(0);
        const json = await res.json().catch(() => null);
        setThanks(json?.pending ? "pending" : "live");
        await load();
      } else {
        const json = await res.json().catch(() => null);
        setFields(json?.error?.fields ?? {});
        setFormError(json?.error?.message ?? "Something went wrong. Try again.");
      }
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const err = (k: keyof Fields) => fields[k]?.[0];
  const idp = project ? `c-${project}` : "c-all";

  return (
    <section className="comments" aria-labelledby={`${idp}-h`}>
      <h2 id={`${idp}-h`}>{project ? "Feedback" : "Feedback and ratings"}</h2>

      {state === "ready" && (
        <p className="comments-summary">
          {meta.average !== null ? (
            <>
              <strong className="avg">{meta.average.toFixed(1)}</strong> <Stars value={meta.average} size={18} />{" "}
              <span className="dim">from {meta.total} {meta.total === 1 ? "review" : "reviews"}</span>
            </>
          ) : meta.total > 0 ? (
            <span className="dim">{meta.total} {meta.total === 1 ? "review" : "reviews"} so far. The average appears after a few more.</span>
          ) : (
            <span className="dim">No feedback yet. Be the first.</span>
          )}
        </p>
      )}

      {state === "unavailable" ? (
        <p className="dim">Feedback is not switched on yet. Connect Supabase to enable it.</p>
      ) : (
        <form className="form comment-form" onSubmit={submit} noValidate>
          {!project && (
            <>
              <label htmlFor={`${idp}-t`}>What are you commenting on?</label>
              <select id={`${idp}-t`} value={target} onChange={(e) => setTarget(e.target.value)} className="select">
                <option value="general">General (the portfolio)</option>
                {projects.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.title}</option>
                ))}
              </select>
              {err("project") && <p className="field-error">{err("project")}</p>}
            </>
          )}

          <label htmlFor={`${idp}-n`}>Your name</label>
          <input id={`${idp}-n`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} aria-invalid={!!err("name")} aria-describedby={err("name") ? `${idp}-ne` : undefined} />
          {err("name") && <p id={`${idp}-ne`} className="field-error">{err("name")}</p>}

          <span className="label" id={`${idp}-r`}>Your rating</span>
          <StarInput value={rating} onChange={setRating} describedBy={err("rating") ? `${idp}-re` : `${idp}-r`} invalid={!!err("rating")} />
          {err("rating") && <p id={`${idp}-re`} className="field-error">{err("rating")}</p>}

          <label htmlFor={`${idp}-b`}>Comment</label>
          <textarea id={`${idp}-b`} rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} aria-invalid={!!err("body")} aria-describedby={err("body") ? `${idp}-be` : undefined} />
          {err("body") && <p id={`${idp}-be`} className="field-error">{err("body")}</p>}

          <div className="hp" aria-hidden="true">
            <label htmlFor={`${idp}-w`}>Website</label>
            <input id={`${idp}-w`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>

          {formError && <p className="form-error" role="alert">{formError}</p>}
          {thanks && !formError && <p className="ok" role="status">{thanks === "pending" ? "Thanks! Your feedback will appear once it has been approved." : "Thanks! Your feedback is live."}</p>}
          <div className="row">
            <button className="btn" type="submit" disabled={sending}>{sending ? "Sending..." : "Send feedback"}</button>
          </div>
        </form>
      )}

      {state === "loading" && <p className="dim" role="status">Loading reviews...</p>}
      {state === "error" && (
        <p className="form-error" role="alert">
          Could not load reviews. <button className="link-btn" onClick={load}>Try again</button>
        </p>
      )}

      {state === "ready" && list.length > 0 && (
        <>
          <ul className="comment-list" aria-label="Feedback">
            {list.map((c) => (
              <li key={c.id} className="comment">
                <span className="avatar sm" aria-hidden="true">{c.name.trim()[0]?.toUpperCase() ?? "?"}</span>
                <div className="comment-main">
                  <div className="comment-head">
                    <strong>{c.name}</strong>
                    <Stars value={c.rating} size={14} />
                    <span className="dim small">{fmt(c.createdAt)}</span>
                  </div>
                  {!project && <p className="dim small">on {titleOf(c.projectSlug)}</p>}
                  <p className="comment-body">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
          {list.length < meta.total && (
            <button className="btn btn-quiet" onClick={more} disabled={loadingMore}>
              {loadingMore ? "Loading..." : `Show more (${meta.total - list.length} left)`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
