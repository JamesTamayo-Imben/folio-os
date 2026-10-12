"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../os/Icon";

type Sketch = { id: string; name: string; image: string; updatedAt: string };
const DRAWINGS_KEY = "folio-os-drawings-v1";
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 680;

function readSketches(): Sketch[] {
  try {
    const value = JSON.parse(localStorage.getItem(DRAWINGS_KEY) ?? "[]") as Sketch[];
    return Array.isArray(value) ? value.filter((sketch) => sketch && typeof sketch.id === "string" && typeof sketch.name === "string" && typeof sketch.image === "string") : [];
  } catch { return []; }
}

export function Draw() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [color, setColor] = useState("#202436");
  const [brushSize, setBrushSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const active = useMemo(() => sketches.find((sketch) => sketch.id === activeId) ?? null, [sketches, activeId]);

  useEffect(() => {
    const stored = readSketches();
    setSketches(stored);
    setActiveId(stored[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(DRAWINGS_KEY, JSON.stringify(sketches)); } catch { /* Keep the active canvas usable if storage is full. */ }
  }, [sketches, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!active?.image) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    image.src = active.image;
  }, [activeId, active?.image]);

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    try {
      const image = canvas.toDataURL("image/png");
      setSketches((current) => current.map((sketch) => sketch.id === active.id ? { ...sketch, image, updatedAt: new Date().toISOString() } : sketch));
    } catch { /* Browser storage can be unavailable. */ }
  };

  const newSketch = () => {
    const sketch = { id: crypto.randomUUID(), name: `Drawing ${sketches.length + 1}`, image: "", updatedAt: new Date().toISOString() };
    setSketches((current) => [sketch, ...current]);
    setActiveId(sketch.id);
  };

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = eraser ? "#ffffff" : color;
    context.lineWidth = brushSize * canvas.width / canvas.getBoundingClientRect().width;
    context.lineTo(current.x + 0.1, current.y + 0.1);
    context.stroke();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    saveCanvas();
  };

  const removeSketch = () => {
    if (!active) return;
    const remaining = sketches.filter((sketch) => sketch.id !== active.id);
    setSketches(remaining);
    setActiveId(remaining[0]?.id ?? null);
  };

  return (
    <div className="local-app draw-app">
      <aside className="draw-sidebar"><div className="local-app-heading"><div><p className="local-eyebrow">ON THIS DEVICE</p><h2>My drawings</h2></div><button className="icon-action" onClick={newSketch} title="New drawing" aria-label="Create drawing"><Icon name="plus" size={18} /></button></div><div className="draw-list">{sketches.map((sketch) => <button key={sketch.id} className={`draw-list-item ${activeId === sketch.id ? "is-active" : ""}`} onClick={() => setActiveId(sketch.id)}><img src={sketch.image || undefined} alt="" /><span>{sketch.name}</span></button>)}</div></aside>
      <section className="draw-workspace">
        {active ? <>
          <header className="draw-toolbar"><input className="draw-title" value={active.name} maxLength={80} aria-label="Drawing name" onChange={(event) => setSketches((current) => current.map((sketch) => sketch.id === active.id ? { ...sketch, name: event.target.value } : sketch))} /><span className="draw-tool-separator" /><label className="draw-color" title="Brush color"><span>Color</span><input type="color" value={color} disabled={eraser} onChange={(event) => setColor(event.target.value)} /></label><label className="draw-size" title="Brush size"><span>Size</span><input type="range" min="2" max="30" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /></label><button className={`btn btn-sm ${eraser ? "btn-quiet" : "btn-quiet"}`} onClick={() => setEraser((value) => !value)} aria-pressed={eraser}>{eraser ? "Brush" : "Eraser"}</button><button className="icon-action danger-action" onClick={removeSketch} aria-label="Delete drawing" title="Delete drawing"><Icon name="trash" size={17} /></button></header>
          <div className="draw-canvas-frame"><canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-label="Drawing canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishStroke} onPointerCancel={finishStroke} /></div>
          <footer className="draw-footer"><span>Draw with your pointer or touch · Saved on this device</span><button className="btn btn-sm btn-quiet" onClick={() => { const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (canvas && context) { context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); saveCanvas(); } }}>Clear canvas</button></footer>
        </> : <div className="local-empty-state"><span className="local-empty-icon"><Icon name="edit" size={30} /></span><h2>Make something</h2><p>Your sketches are saved privately in this browser.</p><button className="btn" onClick={newSketch}>Start a drawing</button></div>}
      </section>
    </div>
  );
}
