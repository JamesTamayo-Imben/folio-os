"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { compressImageFile, readLocalPhotos, writeLocalPhotos, type LocalPhoto } from "@/lib/local-media";
import { useOs } from "@/lib/store";
import { Icon } from "../os/Icon";

type Album = "camera" | "mine";
const CAMERA_KEY = "folio-os-camera-roll-v1";
const MINE_KEY = "folio-os-camera-my-pictures-v1";

export function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [album, setAlbum] = useState<Album>("camera");
  const [cameraPhotos, setCameraPhotos] = useState<LocalPhoto[]>([]);
  const [myPhotos, setMyPhotos] = useState<LocalPhoto[]>([]);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<LocalPhoto | null>(null);

  useEffect(() => {
    setCameraPhotos(readLocalPhotos(CAMERA_KEY));
    setMyPhotos(readLocalPhotos(MINE_KEY));
    setReady(true);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  useEffect(() => {
    if (!cameraOn || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => setCameraError("Camera preview could not start. Check browser permissions."));
  }, [cameraOn]);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is unavailable. Use a secure connection or upload a photo instead.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraOn(true);
    } catch {
      setCameraError("Camera permission was denied or no camera is available. You can still add photos from your device.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / video.videoWidth, 1600 / video.videoHeight);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const next = [{ id: crypto.randomUUID(), name: `Camera ${new Date().toLocaleString()}`, dataUrl: canvas.toDataURL("image/jpeg", 0.82), createdAt: new Date().toISOString() }, ...cameraPhotos].slice(0, 30);
    if (writeLocalPhotos(CAMERA_KEY, next)) {
      setCameraPhotos(next);
      useOs.getState().notify("Photo saved in Camera roll on this device.");
    } else useOs.getState().notify("Local storage is full. Delete some photos and try again.");
  };

  const addMyPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: LocalPhoto[] = [];
    for (const file of Array.from(files)) {
      try { added.push({ id: crypto.randomUUID(), name: file.name, dataUrl: await compressImageFile(file), createdAt: new Date().toISOString() }); }
      catch (error) { useOs.getState().notify(error instanceof Error ? error.message : "Could not add this photo."); }
    }
    const next = [...added, ...myPhotos].slice(0, 30);
    if (added.length && writeLocalPhotos(MINE_KEY, next)) {
      setMyPhotos(next);
      useOs.getState().notify(`${added.length} photo${added.length === 1 ? "" : "s"} saved in My pictures.`);
    } else if (added.length) useOs.getState().notify("Local storage is full. Delete some photos and try again.");
    setBusy(false);
  };

  const photos = album === "camera" ? cameraPhotos : myPhotos;
  const removePhoto = (photo: LocalPhoto) => {
    const next = photos.filter((item) => item.id !== photo.id);
    if (writeLocalPhotos(album === "camera" ? CAMERA_KEY : MINE_KEY, next)) {
      if (album === "camera") setCameraPhotos(next);
      else setMyPhotos(next);
      setPreview(null);
    }
  };

  return (
    <div className="local-app camera-app">
      <header className="camera-heading"><div><p className="local-eyebrow">PRIVATE MEDIA</p><h2>Camera &amp; pictures</h2></div><div className="camera-tabs" role="tablist" aria-label="Photo folders"><button role="tab" aria-selected={album === "camera"} className={album === "camera" ? "is-active" : ""} onClick={() => { stopCamera(); setAlbum("camera"); }}>Camera roll <span>{cameraPhotos.length}</span></button><button role="tab" aria-selected={album === "mine"} className={album === "mine" ? "is-active" : ""} onClick={() => { stopCamera(); setAlbum("mine"); }}>My pictures <span>{myPhotos.length}</span></button></div></header>
      {album === "camera" ? <section className="camera-panel">
        <div className="camera-view">{cameraOn ? <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" /> : <div className="camera-placeholder"><span className="local-empty-icon"><Icon name="camera" size={30} /></span><strong>Your camera stays on this device</strong><p>Allow camera access to take a picture. Photos are saved only in your local Camera roll.</p></div>}{cameraOn && <span className="camera-live"><i /> LIVE</span>}</div>
        <div className="camera-controls">{cameraOn ? <><button className="btn" onClick={capture}><Icon name="camera" size={17} /> Take photo</button><button className="btn btn-quiet" onClick={stopCamera}>Turn camera off</button></> : <button className="btn" onClick={() => void startCamera()}><Icon name="camera" size={17} /> Turn camera on</button>}<span className="dim small">Camera permission is requested only when you turn it on.</span></div>
        {cameraError && <p className="camera-error" role="status">{cameraError}</p>}
      </section> : <section className="camera-upload-panel"><div><strong>My pictures</strong><p className="dim small">A separate local folder for photos you choose to keep here.</p></div><button className="btn" onClick={() => uploadRef.current?.click()} disabled={!ready || busy}><Icon name="plus" size={17} />{busy ? "Adding photos…" : "Add pictures"}</button><input ref={uploadRef} className="sr" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { void addMyPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} /></section>}
      {photos.length ? <div className="camera-photo-grid">{photos.map((photo) => <button key={photo.id} className="photo-card" onClick={() => setPreview(photo)} aria-label={`View ${photo.name}`}><img src={photo.dataUrl} alt={photo.name} /><span><strong>{photo.name}</strong><time>{new Date(photo.createdAt).toLocaleDateString()}</time></span></button>)}</div> : <p className="local-empty camera-empty">{album === "camera" ? "Camera captures will appear here." : "Your separate My pictures folder is empty."}</p>}
      {preview && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={preview.name} onPointerDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}><button className="photo-viewer-close" onClick={() => setPreview(null)} aria-label="Close photo">×</button><img src={preview.dataUrl} alt={preview.name} /><div className="photo-viewer-actions"><p>{preview.name} · {new Date(preview.createdAt).toLocaleDateString()}</p><button className="btn btn-sm btn-danger" onClick={() => removePhoto(preview)}><Icon name="trash" size={15} /> Delete</button></div></div>}
    </div>
  );
}
