"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { compressPhotoFile } from "@/lib/contacts/compressPhoto";

/**
 * Photo picker for create/edit. Keeps the current data URL in a hidden input so
 * PUT replace does not wipe an existing photo when the user only edits text.
 */
export default function PhotoField({
  initialPhoto,
  error,
  onCompressingChange,
}: {
  initialPhoto?: string | null;
  error?: string;
  onCompressingChange?: (compressing: boolean) => void;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(initialPhoto ?? null);
  const [cleared, setCleared] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();
  const [compressing, setCompressing] = useState(false);

  const shownError = error ?? localError;

  useEffect(() => {
    onCompressingChange?.(compressing);
  }, [compressing, onCompressingChange]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLocalError(undefined);
    setCleared(false);

    if (!file) return;

    setCompressing(true);
    try {
      const result = await compressPhotoFile(file);
      if (result.error || !result.dataUrl) {
        setLocalError(result.error ?? "Could not process this image.");
        event.target.value = "";
        return;
      }
      setPreview(result.dataUrl);
    } catch {
      setLocalError("Could not process this image.");
      event.target.value = "";
    } finally {
      setCompressing(false);
    }
  }

  function clearPhoto() {
    setPreview(null);
    setCleared(true);
    setLocalError(undefined);
    const input = document.getElementById(`${id}-file`) as HTMLInputElement | null;
    if (input) input.value = "";
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Photo</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Photo
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Optional circular profile image. Large photos are automatically resized
          and compressed.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview / data URL
          <img
            src={preview}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full aspect-square object-cover"
          />
        ) : (
          <span
            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            {compressing ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
            ) : (
              <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
            )}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`${id}-file`}
            className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 ${compressing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
            {compressing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Compressing…
              </>
            ) : preview ? (
              "Change photo"
            ) : (
              "Upload photo"
            )}
          </label>
          <input
            id={`${id}-file`}
            name="photo_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={compressing}
            onChange={onFileChange}
          />

          {preview && !compressing ? (
            <button
              type="button"
              onClick={clearPhoto}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {/* Preserve existing photo on PUT when no new file is chosen. */}
      <input type="hidden" name="photo" value={cleared ? "" : (preview ?? "")} />
      {cleared ? <input type="hidden" name="photo_clear" value="1" /> : null}

      {shownError ? (
        <p role="alert" className="text-[13px] text-destructive">
          {shownError}
        </p>
      ) : null}
    </fieldset>
  );
}
