/** MIME types accepted for contact profile photos (file uploads and data URLs). */
export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_PHOTO_MIME_TYPES);

/** Base64 alphabet with optional padding. */
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

/**
 * Validate a photo data URL: allowed MIME only, well-formed base64 payload.
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
  if (!payload || !BASE64_RE.test(payload)) return false;

  return true;
}

export const PHOTO_DATA_URL_ERROR =
  "Use a JPEG, PNG, WebP, or GIF image data URL";
