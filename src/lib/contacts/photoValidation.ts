/** MIME types accepted for contact profile photos (file uploads and data URLs). */
export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_PHOTO_MIME_TYPES);

function isValidBase64Payload(payload: string): boolean {
  if (!payload || payload.length % 4 === 1) return false;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) return false;
  try {
    if (typeof Buffer !== "undefined") {
      Buffer.from(payload, "base64");
      return true;
    }
    atob(payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a photo data URL: allowed MIME only, decodable base64 payload.
 * Empty strings are invalid here — callers treat blank as null before calling.
 */
export function isAllowedPhotoDataUrl(value: string): boolean {
  const comma = value.indexOf(",");
  if (comma === -1) return false;

  const header = value.slice(0, comma);
  const payload = value.slice(comma + 1);

  if (!header.startsWith("data:") || !header.endsWith(";base64")) return false;

  const mime = header.slice("data:".length, -";base64".length);
  if (!ALLOWED_MIME_SET.has(mime)) return false;

  return isValidBase64Payload(payload);
}

export const PHOTO_DATA_URL_ERROR =
  "Use a JPEG, PNG, WebP, or GIF image data URL";
