"use client";
import { binItems } from "@/data/projects";
import { useOs } from "@/lib/store";
import { coverBackground } from "../os/CoverArt";

export function RecycleBin() {
  const notify = useOs((s) => s.notify);
  return (
    <div className="pad">
      <h1 className="about-name">Recycle Bin</h1>
      <p className="dim">Directions I dropped, and what each one taught me.</p>
      <ul className="bin">
        {binItems.map((b) => (
          <li key={b.title} className="bin-item">
            <span className="bin-thumb" style={{ background: coverBackground(b.palette) }} aria-hidden="true" />
            <div>
              <h2 className="bin-title">{b.title}</h2>
              <p>{b.why}</p>
            </div>
            <button className="btn btn-quiet" onClick={() => notify(`"${b.title}" stays in the bin. The lesson was kept.`)}>
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
