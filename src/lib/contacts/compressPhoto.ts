import { MAX_PHOTO_BYTES } from "@/lib/contacts/schema";

/** Square avatar edge length after resize. */
const MAX_EDGE_PX = 512;

/** JPEG qualities to try, highest first. */
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45] as const;

/** Base64 data URLs are ~4/3 the raw JPEG size plus a short prefix. */
const MAX_DATA_URL_CHARS = Math.floor(MAX_PHOTO_BYTES * (4 / 3)) + 64;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read compressed image."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read compressed image."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load this image."));
    };
    img.src = url;
  });
}

/**
 * Resize to a square avatar and re-encode as JPEG until the data URL fits the limit.
 * Large originals are accepted — compression happens entirely in the browser.
 */
export async function compressPhotoFile(
  file: File,
): Promise<{ dataUrl: string; error?: undefined } | { dataUrl?: undefined; error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "Use a JPEG, PNG, WebP, or GIF image." };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return { error: "Could not load this image." };
  }

  const canvas = document.createElement("canvas");
  canvas.width = MAX_EDGE_PX;
  canvas.height = MAX_EDGE_PX;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { error: "Could not process this image." };
  }

  // Center-crop to square, then scale to MAX_EDGE_PX (LinkedIn-style avatar).
  const cropSize = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - cropSize) / 2;
  const sy = (img.naturalHeight - cropSize) / 2;
  ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, MAX_EDGE_PX, MAX_EDGE_PX);

  for (const quality of QUALITY_STEPS) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) continue;

    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length <= MAX_DATA_URL_CHARS) {
      return { dataUrl };
    }
  }

  return {
    error:
      "Could not compress this photo enough. Try a smaller or simpler image.",
  };
}
