import "server-only";

import { MAX_PHOTO_BYTES } from "@/lib/contacts/schema";

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Read the photo from the form. Client-side compression stores a data URL in the
 * hidden `photo` field; `photo_file` is only a fallback when JS did not run.
 */
export async function resolvePhotoFromFormData(
  formData: FormData,
): Promise<{ photo: string; error?: string }> {
  if (formData.get("photo_clear") === "1") {
    return { photo: "" };
  }

  const hidden = String(formData.get("photo") ?? "");
  if (hidden.startsWith("data:image/") && hidden.includes(";base64,")) {
    if (hidden.length > MAX_PHOTO_BYTES * (4 / 3) + 64) {
      return {
        photo: "",
        error: "Photo is too large (max ~500 KB).",
      };
    }
    return { photo: hidden };
  }

  const file = formData.get("photo_file");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      return {
        photo: "",
        error: "Use a JPEG, PNG, WebP, or GIF image.",
      };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return {
        photo: "",
        error: "Photo must be 500 KB or smaller.",
      };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      photo: `data:${file.type};base64,${buffer.toString("base64")}`,
    };
  }

  return { photo: hidden };
}
