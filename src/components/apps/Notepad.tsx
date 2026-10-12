"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../os/Icon";

type Note = { id: string; title: string; content: string; updatedAt: string };
const NOTES_KEY = "folio-os-notes-v1";

function readNotes(): Note[] {
  try {
    const value = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]") as Note[];
    return Array.isArray(value) ? value.filter((note) => note && typeof note.id === "string" && typeof note.title === "string" && typeof note.content === "string") : [];
  } catch { return []; }
}

export function Notepad() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const active = useMemo(() => notes.find((note) => note.id === activeId) ?? null, [notes, activeId]);

  useEffect(() => {
    const stored = readNotes();
    setNotes(stored);
    setActiveId(stored[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
  }, [notes, ready]);

  const createNote = () => {
    const note = { id: crypto.randomUUID(), title: "Untitled note", content: "", updatedAt: new Date().toISOString() };
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
  };

  const updateActive = (changes: Partial<Pick<Note, "title" | "content">>) => {
    if (!activeId) return;
    setNotes((current) => current.map((note) => note.id === activeId ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note));
  };

  const deleteActive = () => {
    if (!active) return;
    const remaining = notes.filter((note) => note.id !== active.id);
    setNotes(remaining);
    setActiveId(remaining[0]?.id ?? null);
  };

  return (
    <div className="local-app notepad-app">
      <aside className="notepad-sidebar">
        <div className="local-app-heading"><div><p className="local-eyebrow">ON THIS DEVICE</p><h2>My notes</h2></div><button className="icon-action" onClick={createNote} aria-label="Create a note" title="New note"><Icon name="plus" size={18} /></button></div>
        <div className="notepad-note-list">
          {notes.map((note) => <button key={note.id} className={`notepad-note ${note.id === activeId ? "is-active" : ""}`} onClick={() => setActiveId(note.id)}><strong>{note.title || "Untitled note"}</strong><span>{note.content.trim().split("\n")[0] || "No text yet"}</span><time>{new Date(note.updatedAt).toLocaleDateString()}</time></button>)}
          {!notes.length && <p className="local-empty small">Your notes are private to this browser. Create one to get started.</p>}
        </div>
      </aside>
      <section className="notepad-editor" aria-label="Note editor">
        {active ? <>
          <header className="notepad-toolbar"><input className="notepad-title" value={active.title} onChange={(event) => updateActive({ title: event.target.value })} aria-label="Note title" maxLength={120} /><span className="save-status">{saveFailed ? "Storage full — changes not saved" : "Saved locally"}</span><button className="icon-action danger-action" onClick={deleteActive} aria-label="Delete note" title="Delete note"><Icon name="trash" size={17} /></button></header>
          <textarea className="notepad-content" value={active.content} onChange={(event) => updateActive({ content: event.target.value })} placeholder="Start writing…" aria-label="Note contents" spellCheck />
        </> : <div className="local-empty-state"><span className="local-empty-icon"><Icon name="notepad" size={30} /></span><h2>No note selected</h2><p>Create a note to write down an idea, plan, or reminder.</p><button className="btn" onClick={createNote}>Create a note</button></div>}
      </section>
    </div>
  );
}
