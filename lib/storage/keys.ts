import { randomUUID } from "crypto";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

export function extensionForContentType(contentType: string): string | null {
  return EXTENSIONS[contentType.toLowerCase()] ?? null;
}

export function isAllowedImageType(contentType: string): boolean {
  return extensionForContentType(contentType) !== null;
}

/** Storage key for a listing photo, namespaced per user so keys never collide. */
export function listingPhotoKey(userId: string, contentType: string): string {
  const ext = extensionForContentType(contentType) ?? "bin";
  return `listings/${userId}/${randomUUID()}.${ext}`;
}
