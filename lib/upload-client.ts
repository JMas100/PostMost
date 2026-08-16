export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface PresignedUpload {
  uploadUrl: string;
  url: string;
  key: string;
}

async function requestPresignedUploads(files: { contentType: string; size: number }[]): Promise<PresignedUpload[]> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
  const data = (await res.json().catch(() => ({}))) as { uploads?: PresignedUpload[]; error?: string };
  if (!res.ok || !data.uploads) {
    throw new Error(data.error || "Upload failed");
  }
  return data.uploads;
}

/** Uploads blobs straight to object storage via presigned PUT URLs and returns their public URLs. */
export async function uploadImages(blobs: Blob[]): Promise<string[]> {
  if (blobs.length === 0) return [];

  for (const blob of blobs) {
    if (!blob.type.startsWith("image/")) throw new Error("Only image files can be uploaded");
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Images must be smaller than 10 MB");
  }

  const uploads = await requestPresignedUploads(blobs.map((blob) => ({ contentType: blob.type, size: blob.size })));

  await Promise.all(
    uploads.map(async (upload, index) => {
      const res = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": blobs[index].type },
        body: blobs[index],
      });
      if (!res.ok) throw new Error("Upload to storage failed");
    })
  );

  return uploads.map((upload) => upload.url);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const contentType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

/** Uploads an AI-returned data URL and returns its hosted URL. */
export async function uploadDataUrl(dataUrl: string): Promise<string> {
  const [url] = await uploadImages([dataUrlToBlob(dataUrl)]);
  return url;
}
