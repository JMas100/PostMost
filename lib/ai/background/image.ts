/** Loads an http(s) or `data:` image URL into a Blob suitable for multipart upload. */
export async function imageToBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  if (!url.startsWith("data:")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { blob: new Blob([buffer], { type: mime }), filename: `photo.${mime.split("/").pop() || "jpg"}` };
  }

  const [header, base64] = url.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const ext = mime.split("/").pop() || "jpg";
  const buffer = Buffer.from(base64, "base64");
  return { blob: new Blob([buffer], { type: mime }), filename: `photo.${ext}` };
}
