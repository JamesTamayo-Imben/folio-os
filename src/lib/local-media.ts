export interface LocalPhoto {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
}

const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[\da-z+/=]+$/i;

export function readLocalPhotos(key: string): LocalPhoto[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalPhoto[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((photo) => photo && typeof photo.id === "string" && typeof photo.name === "string" && typeof photo.createdAt === "string" && typeof photo.dataUrl === "string" && IMAGE_DATA_URL.test(photo.dataUrl));
  } catch {
    return [];
  }
}

export function writeLocalPhotos(key: string, photos: LocalPhoto[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(photos));
    return true;
  } catch {
    return false;
  }
}

export async function compressImageFile(file: File, maxSide = 1600): Promise<string> {
  if (!file.type.match(/^image\/(?:jpeg|png|webp)$/i)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Images must be smaller than 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSide / bitmap.width, maxSide / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process this image.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}
