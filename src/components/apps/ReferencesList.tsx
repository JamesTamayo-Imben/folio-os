"use client";
import { useReferences } from "../os/projects-context";

/** Curated testimonials. Renders nothing when there are none, so an empty section never appears. */
export function ReferencesList({ heading = "What people say" }: { heading?: string }) {
  const refs = useReferences();
  if (refs.length === 0) return null;
  return (
    <section aria-labelledby="refs-h" className="refs">
      <h2 id="refs-h">{heading}</h2>
      <ul className="refs-list">
        {refs.map((r) => (
          <li key={r.id ?? r.name}>
            <figure className="ref">
              <blockquote>{r.quote}</blockquote>
              <figcaption>
                <strong>{r.name}</strong>
                {(r.title || r.company) && <span className="dim">, {[r.title, r.company].filter(Boolean).join(" at ")}</span>}
                {r.linkUrl && (
                  <>
                    {" "}
                    <a href={r.linkUrl} target="_blank" rel="noopener noreferrer">
                      Profile<span className="sr"> of {r.name} (opens in a new tab)</span>
                    </a>
                  </>
                )}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
